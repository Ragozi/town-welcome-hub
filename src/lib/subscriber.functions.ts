import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequestHeader } from "@tanstack/react-start/server";

// ---------- Helpers ----------
async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

// ---------- Detect town from IP (Cloudflare) ----------
export const detectAndSetTown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Cloudflare Worker injects these headers
    const lat = parseFloat(getRequestHeader("cf-iplatitude") ?? "");
    const lng = parseFloat(getRequestHeader("cf-iplongitude") ?? "");

    let townId: string | null = null;
    let townName: string | null = null;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const { data } = await supabaseAdmin.rpc("nearest_town", {
        lat,
        lng,
        max_km: 60,
      });
      const row = (data ?? [])[0];
      if (row) {
        const { data: town } = await supabaseAdmin
          .from("towns")
          .select("id, name")
          .eq("slug", row.slug)
          .maybeSingle();
        if (town) {
          townId = town.id;
          townName = town.name;
        }
      }
    }

    if (townId) {
      await supabaseAdmin
        .from("subscriber_profiles")
        .update({ home_town_id: townId })
        .eq("user_id", context.userId)
        .is("home_town_id", null); // only fill if empty
    }

    return { town_id: townId, town_name: townName };
  });

// ---------- Update preferences (also marks onboarded) ----------
const UpdatePrefsSchema = z.object({
  home_town_id: z.string().uuid().nullable().optional(),
  interest_tags: z.array(z.string().max(40)).max(20).optional(),
  lifestyle_tags: z.array(z.string().max(40)).max(20).optional(),
  has_kids: z.boolean().optional(),
  has_pets: z.boolean().optional(),
  mark_onboarded: z.boolean().optional(),
});

export const updateSubscriberPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdatePrefsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const patch: {
      home_town_id?: string | null;
      interest_tags?: string[];
      lifestyle_tags?: string[];
      has_kids?: boolean;
      has_pets?: boolean;
      onboarded_at?: string;
    } = {};
    if (data.home_town_id !== undefined) patch.home_town_id = data.home_town_id;
    if (data.interest_tags !== undefined) patch.interest_tags = data.interest_tags;
    if (data.lifestyle_tags !== undefined) patch.lifestyle_tags = data.lifestyle_tags;
    if (data.has_kids !== undefined) patch.has_kids = data.has_kids;
    if (data.has_pets !== undefined) patch.has_pets = data.has_pets;
    if (data.mark_onboarded) patch.onboarded_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("subscriber_profiles")
      .update(patch)
      .eq("user_id", context.userId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

// ---------- Marketing opt-in toggle ----------
const TopicEnum = z.enum(["local_deals", "new_businesses", "town_events", "realtor_recommendations"]);
const ToggleOptInSchema = z.object({
  topic: TopicEnum,
  opt_in: z.boolean(),
  source: z.string().max(40).default("preferences"),
});

export const toggleMarketingOptIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleOptInSchema.parse(i))
  .handler(async ({ data, context }) => {
    if (data.opt_in) {
      const { error } = await supabaseAdmin
        .from("marketing_subscriptions")
        .upsert(
          {
            user_id: context.userId,
            topic: data.topic,
            opted_in_at: new Date().toISOString(),
            opted_out_at: null,
            source: data.source,
          },
          { onConflict: "user_id,topic" },
        );
      if (error) throw new Response(error.message, { status: 400 });
    } else {
      const { error } = await supabaseAdmin
        .from("marketing_subscriptions")
        .update({ opted_out_at: new Date().toISOString() })
        .eq("user_id", context.userId)
        .eq("topic", data.topic);
      if (error) throw new Response(error.message, { status: 400 });
    }
    return { ok: true };
  });

export const listMyOptIns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("marketing_subscriptions")
      .select("topic, opted_in_at, opted_out_at")
      .eq("user_id", context.userId);
    return { subscriptions: data ?? [] };
  });

// ---------- Saved items ----------
const ItemTypeEnum = z.enum(["business", "coupon", "packet"]);
const ToggleSavedSchema = z.object({
  item_type: ItemTypeEnum,
  item_id: z.string().uuid(),
  save: z.boolean(),
});

export const toggleSaved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleSavedSchema.parse(i))
  .handler(async ({ data, context }) => {
    if (data.save) {
      const { error } = await supabaseAdmin
        .from("saved_items")
        .upsert(
          { user_id: context.userId, item_type: data.item_type, item_id: data.item_id },
          { onConflict: "user_id,item_type,item_id" },
        );
      if (error) throw new Response(error.message, { status: 400 });
    } else {
      await supabaseAdmin
        .from("saved_items")
        .delete()
        .eq("user_id", context.userId)
        .eq("item_type", data.item_type)
        .eq("item_id", data.item_id);
    }
    return { ok: true };
  });

export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ business_id: z.string().uuid(), redeem: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    if (data.redeem) {
      // Ensure saved row exists, then mark redeemed
      await supabaseAdmin
        .from("saved_items")
        .upsert(
          {
            user_id: context.userId,
            item_type: "coupon",
            item_id: data.business_id,
            redeemed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,item_type,item_id" },
        );
    } else {
      await supabaseAdmin
        .from("saved_items")
        .update({ redeemed_at: null })
        .eq("user_id", context.userId)
        .eq("item_type", "coupon")
        .eq("item_id", data.business_id);
    }
    return { ok: true };
  });

export const listSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: saved } = await supabaseAdmin
      .from("saved_items")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    const rows = saved ?? [];
    const bizIds = rows.filter((r) => r.item_type === "business" || r.item_type === "coupon").map((r) => r.item_id);
    const packetIds = rows.filter((r) => r.item_type === "packet").map((r) => r.item_id);

    const [{ data: businesses }, { data: packets }] = await Promise.all([
      bizIds.length
        ? supabaseAdmin
            .from("businesses")
            .select("id, name, address, phone, website, logo_url, coupon_text, coupon_expires, sponsor_tier, town_id")
            .in("id", bizIds)
        : Promise.resolve({ data: [] as any[] }),
      packetIds.length
        ? supabaseAdmin
            .from("packets")
            .select("id, slug, buyer_first_name, address, town_id")
            .in("id", packetIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const bizById = new Map((businesses ?? []).map((b: any) => [b.id, b]));
    const pkById = new Map((packets ?? []).map((p: any) => [p.id, p]));

    return {
      businesses: rows
        .filter((r) => r.item_type === "business")
        .map((r) => ({ ...r, item: bizById.get(r.item_id) ?? null })),
      coupons: rows
        .filter((r) => r.item_type === "coupon")
        .map((r) => ({ ...r, item: bizById.get(r.item_id) ?? null })),
      packets: rows
        .filter((r) => r.item_type === "packet")
        .map((r) => ({ ...r, item: pkById.get(r.item_id) ?? null })),
    };
  });

// ---------- Personalized town feed ----------
export const getMyFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subProf } = await supabaseAdmin
      .from("subscriber_profiles")
      .select("home_town_id, interest_tags")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!subProf?.home_town_id) {
      return { town: null, sponsors: [], coupons: [], businesses: [], packets: [] };
    }

    const [{ data: town }, { data: sponsors }, { data: coupons }, { data: businesses }, { data: packets }] =
      await Promise.all([
        supabaseAdmin.from("towns").select("id, name, slug, hero_blurb").eq("id", subProf.home_town_id).maybeSingle(),
        supabaseAdmin
          .from("businesses")
          .select("id, name, logo_url, sponsor_tier, address, phone, website")
          .eq("town_id", subProf.home_town_id)
          .neq("sponsor_tier", "none")
          .order("featured_order", { ascending: false })
          .limit(8),
        supabaseAdmin
          .from("businesses")
          .select("id, name, logo_url, coupon_text, coupon_expires, address")
          .eq("town_id", subProf.home_town_id)
          .not("coupon_text", "is", null)
          .or("coupon_expires.is.null,coupon_expires.gte." + new Date().toISOString().slice(0, 10))
          .limit(12),
        supabaseAdmin
          .from("businesses")
          .select("id, name, logo_url, address, subcategory, category_id")
          .eq("town_id", subProf.home_town_id)
          .order("created_at", { ascending: false })
          .limit(12),
        supabaseAdmin
          .from("packets")
          .select("id, slug, buyer_first_name, address, created_at")
          .eq("town_id", subProf.home_town_id)
          .eq("status", "generated")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    return {
      town: town ?? null,
      sponsors: sponsors ?? [],
      coupons: coupons ?? [],
      businesses: businesses ?? [],
      packets: packets ?? [],
    };
  });

// ---------- Account deletion ----------
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Cascade: subscriber_profiles, marketing_subscriptions, saved_items, profiles, user_roles
    await Promise.all([
      supabaseAdmin.from("saved_items").delete().eq("user_id", context.userId),
      supabaseAdmin.from("marketing_subscriptions").delete().eq("user_id", context.userId),
      supabaseAdmin.from("subscriber_profiles").delete().eq("user_id", context.userId),
      supabaseAdmin.from("profiles").delete().eq("user_id", context.userId),
      supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId),
    ]);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

// ---------- Admin: list subscribers ----------
export const adminListSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: subs } = await supabaseAdmin
      .from("subscriber_profiles")
      .select("user_id, home_town_id, interest_tags, has_kids, has_pets, onboarded_at, created_at");
    const userIds = (subs ?? []).map((s) => s.user_id);
    if (userIds.length === 0) {
      return { subscribers: [], topicsByTown: {}, total: 0, withOptIns: 0 };
    }

    const [{ data: profs }, { data: townsRows }, { data: optIns }, { data: usersResp }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, full_name, email_public").in("user_id", userIds),
      supabaseAdmin.from("towns").select("id, name"),
      supabaseAdmin.from("marketing_subscriptions").select("user_id, topic, opted_in_at, opted_out_at").in("user_id", userIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const profById = new Map((profs ?? []).map((p) => [p.user_id, p]));
    const townById = new Map((townsRows ?? []).map((t) => [t.id, t.name]));
    const userById = new Map((usersResp?.users ?? []).map((u) => [u.id, u]));
    const optInsByUser = new Map<string, { topic: string; active: boolean }[]>();
    for (const o of optIns ?? []) {
      const arr = optInsByUser.get(o.user_id) ?? [];
      arr.push({ topic: o.topic, active: !o.opted_out_at });
      optInsByUser.set(o.user_id, arr);
    }

    const subscribers = (subs ?? []).map((s) => {
      const u = userById.get(s.user_id);
      const p = profById.get(s.user_id);
      return {
        user_id: s.user_id,
        email: u?.email ?? p?.email_public ?? "",
        full_name: p?.full_name ?? null,
        town_name: s.home_town_id ? townById.get(s.home_town_id) ?? null : null,
        interest_tags: s.interest_tags ?? [],
        has_kids: s.has_kids,
        has_pets: s.has_pets,
        onboarded: !!s.onboarded_at,
        created_at: s.created_at,
        opt_ins: (optInsByUser.get(s.user_id) ?? []).filter((o) => o.active).map((o) => o.topic),
      };
    });

    const withOptIns = subscribers.filter((s) => s.opt_ins.length > 0).length;

    return { subscribers, total: subscribers.length, withOptIns };
  });
