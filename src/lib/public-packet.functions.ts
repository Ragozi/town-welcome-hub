import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withDebugLog } from "@/lib/debug-log.server";
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
  .handler(async ({ data }): Promise<PublicPacket | null> =>
    withDebugLog(
      { event_type: "packet", function_name: "getPublicPacket", input: { slug: data.slug } },
      async () => {
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
      },
    ),
  );

// issuePdfToken removed: PDF rendering moved client-side, no signed URL needed.

