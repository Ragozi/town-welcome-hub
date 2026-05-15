import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SponsorTier } from "@/lib/towns";

// ---- Sanitized DTO ----------------------------------------------------------

export type PublicRealtor = {
  full_name: string | null;
  brokerage_name: string | null;
  brokerage_logo_url: string | null;
  headshot_url: string | null;
  email_public: string | null;
  phone: string | null;
  referral_slug: string | null;
};

export type PublicTown = {
  id: string;
  name: string;
  state: string;
  hero_blurb: string | null;
};

export type PublicBusiness = {
  id: string;
  name: string;
  category_id: string;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  coupon_text: string | null;
  sponsor_tier: SponsorTier;
  featured_order: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  icon: string | null;
};

export type PublicPacket = {
  slug: string;
  buyer_first_name: string;
  buyer_has_partner: boolean; // safe boolean instead of last name
  welcome_note: string | null;
  home_photo_url: string | null;
  // Address reduced to town/state — never full street address
  location_label: string | null;
  realtor: PublicRealtor | null;
  town: PublicTown | null;
  categories: PublicCategory[];
  businesses: PublicBusiness[];
};

// ---- getPublicPacket --------------------------------------------------------

export const getPublicPacket = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }): Promise<PublicPacket | null> => {
    const { data: packet } = await supabaseAdmin
      .from("packets")
      .select(
        "slug, buyer_first_name, buyer_last_name, welcome_note, home_photo_url, town_id, realtor_id, excluded_business_ids",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (!packet) return null;

    const [{ data: profile }, townRes, { data: categories }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "full_name, brokerage_name, brokerage_logo_url, headshot_url, email_public, phone, referral_slug",
        )
        .eq("user_id", packet.realtor_id)
        .maybeSingle(),
      packet.town_id
        ? supabaseAdmin
            .from("towns")
            .select("id, name, state, hero_blurb")
            .eq("id", packet.town_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("categories")
        .select("id, name, slug, display_order, icon")
        .order("display_order"),
    ]);

    const town = (townRes.data ?? null) as PublicTown | null;

    let businesses: PublicBusiness[] = [];
    if (town) {
      const { data: bizData } = await supabaseAdmin
        .from("businesses")
        .select(
          "id, name, category_id, subcategory, description, address, phone, website, logo_url, coupon_text, sponsor_tier, featured_order",
        )
        .eq("town_id", town.id);
      const excluded = new Set<string>(packet.excluded_business_ids ?? []);
      businesses = ((bizData ?? []) as PublicBusiness[]).filter((b) => !excluded.has(b.id));
    }

    return {
      slug: packet.slug,
      buyer_first_name: packet.buyer_first_name,
      buyer_has_partner: !!packet.buyer_last_name,
      welcome_note: packet.welcome_note,
      home_photo_url: packet.home_photo_url,
      location_label: town ? `${town.name}, ${town.state}` : null,
      realtor: (profile ?? null) as PublicRealtor | null,
      town,
      categories: (categories ?? []) as PublicCategory[],
      businesses,
    };
  });

// ---- Signed PDF tokens ------------------------------------------------------

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function hmac(payload: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signPdfToken(slug: string, ttlSeconds: number = TOKEN_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = hmac(`${slug}.${exp}`);
  return `${exp}.${sig}`;
}

export function verifyPdfToken(slug: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(`${slug}.${exp}`);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Issues a short-lived signed token for the public buyer landing page or for
 * the realtor's own packet detail view. Anyone who knows a packet slug can
 * already see the public landing page, so issuing a token here is safe — the
 * token's purpose is to (a) keep the PDF storage bucket private and (b) let
 * us add expiry / revocation on the PDF route.
 */
export const issuePdfToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: packet } = await supabaseAdmin
      .from("packets")
      .select("slug")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!packet) return { token: null };
    return { token: signPdfToken(packet.slug) };
  });
