import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signPdfToken } from "@/lib/pdf-token.server";
import type {
  PublicBusiness,
  PublicCategory,
  PublicPacket,
  PublicRealtor,
  PublicTown,
} from "@/lib/public-packet-types";

export type {
  PublicBusiness,
  PublicCategory,
  PublicPacket,
  PublicRealtor,
  PublicTown,
} from "@/lib/public-packet-types";

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

/**
 * Issues a short-lived signed token for the PDF route. Anyone who knows a
 * packet slug already has access to the public buyer landing page, so issuing
 * a token here doesn't expand exposure — it lets us keep the storage bucket
 * private and add expiry to PDF access.
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
    if (!packet) return { token: null as string | null };
    return { token: signPdfToken(packet.slug) as string | null };
  });
