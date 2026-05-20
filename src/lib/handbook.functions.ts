import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withDebugLog } from "@/lib/debug-log.server";
import type { Business, Category, Town } from "@/lib/towns";
import type { Packet } from "@/lib/packets";
import {
  buildRecommendationLog,
  scoreBusinesses,
  topRecommended,
  type RecommendReason,
  type ScoredBusiness,
} from "@/lib/business-recommender";

export type HandbookRealtor = {
  full_name: string | null;
  brokerage_name: string | null;
  brokerage_logo_url: string | null;
  email_public: string | null;
  phone: string | null;
  headshot_url: string | null;
};

export type HandbookRecommendation = {
  business_id: string;
  score: number;
  reasons: RecommendReason[];
};

export type HandbookData = {
  packet: Packet;
  realtor: HandbookRealtor | null;
  town: Town | null;
  categories: Category[];
  businesses: Business[];
  recommended: HandbookRecommendation[];
  liveUrl: string;
  origin: string;
};

export const getHandbookData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<HandbookData | null> => {
    const { userId } = context;
    return withDebugLog(
      { event_type: "packet", function_name: "getHandbookData", input: { slug: data.slug }, user_id: userId },
      async () => {

    const { data: packet } = await supabaseAdmin
      .from("packets")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!packet) return null;
    if (packet.realtor_id !== userId) {
      throw new Response("Forbidden", { status: 403 });
    }

    const [{ data: profile }, townRes, { data: categories }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("full_name, brokerage_name, brokerage_logo_url, email_public, phone, headshot_url")
        .eq("user_id", packet.realtor_id)
        .maybeSingle(),
      packet.town_id
        ? supabaseAdmin
            .from("towns")
            .select("*")
            .eq("id", packet.town_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("categories").select("*").order("display_order"),
    ]);

    const town = (townRes.data ?? null) as Town | null;

    let businesses: Business[] = [];
    let scored: ScoredBusiness<Business>[] = [];
    if (town) {
      const { data: bizData } = await supabaseAdmin
        .from("businesses")
        .select("*")
        .eq("town_id", town.id);
      const excluded = new Set<string>(
        (packet as unknown as Packet & { excluded_business_ids?: string[] | null })
          .excluded_business_ids ?? [],
      );
      businesses = ((bizData ?? []) as Business[]).filter((b) => !excluded.has(b.id));

      const interests = [
        ...((packet as Packet).interests ?? []),
        ...((packet as Packet).lifestyle_tags ?? []),
      ];
      scored = scoreBusinesses({
        businesses,
        categories: (categories ?? []) as Category[],
        interests,
      });

      // Persist a recommendation log so admins can audit why each business
      // surfaced. Fire-and-forget — never block PDF generation on this.
      const log = buildRecommendationLog(scored, 24);
      supabaseAdmin
        .from("packets")
        .update({ recommendation_log: log })
        .eq("id", (packet as Packet).id)
        .then(() => {})
        .catch(() => {});
    }

    const recommended: HandbookRecommendation[] = topRecommended(scored, 12).map((s) => ({
      business_id: s.business.id,
      score: s.score,
      reasons: s.reasons,
    }));

    const origin = process.env.PUBLIC_BASE_URL || "";

    return {
      packet: packet as unknown as Packet,
      realtor: (profile ?? null) as HandbookRealtor | null,
      town,
      categories: (categories ?? []) as Category[],
      businesses,
      recommended,
      liveUrl: `${origin}/p/${packet.slug}`,
      origin,
    };
      },
    );
  });
