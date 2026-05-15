import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ASSIGNABLE_ROLES = ["super_admin", "realtor_admin", "realtor_agent", "sponsor_user"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error || !data) {
    throw new Response("Forbidden — Super Admin only", { status: 403 });
  }
}

async function assertAdminTier(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "realtor_admin"]);
  if (error || !data || data.length === 0) {
    throw new Response("Forbidden", { status: 403 });
  }
}

function siteOriginFromRequest(): string {
  // Read from env var with sensible fallbacks. Used as redirectTo for invites.
  return process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://hearthhandbook.com";
}

// ----- Users -----
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminTier(context.userId);

    const { data: usersResp, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Response(error.message, { status: 500 });

    const userIds = usersResp.users.map((u) => u.id);
    const [{ data: roles }, { data: profiles }, { data: packetCounts }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, brokerage_name, referral_slug, phone")
        .in("user_id", userIds),
      supabaseAdmin.from("packets").select("realtor_id").in("realtor_id", userIds),
    ]);

    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const a = rolesByUser.get(r.user_id) ?? [];
      a.push(r.role);
      rolesByUser.set(r.user_id, a);
    }
    const profByUser = new Map<string, any>();
    for (const p of profiles ?? []) profByUser.set(p.user_id, p);
    const packetCountByUser = new Map<string, number>();
    for (const p of packetCounts ?? []) {
      packetCountByUser.set(p.realtor_id, (packetCountByUser.get(p.realtor_id) ?? 0) + 1);
    }

    return usersResp.users
      .map((u) => {
        const banned = (u as any).banned_until ?? null;
        const invited = (u as any).invited_at ?? null;
        return {
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null,
          confirmed: !!u.email_confirmed_at,
          invited_at: invited,
          banned_until: banned,
          roles: rolesByUser.get(u.id) ?? [],
          profile: profByUser.get(u.id) ?? null,
          packet_count: packetCountByUser.get(u.id) ?? 0,
        };
      })
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  });

const InviteUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  role: z.enum(ASSIGNABLE_ROLES),
});

export const adminInviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InviteUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const redirectTo = `${siteOriginFromRequest()}/login?welcome=1`;
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo,
      data: {
        full_name: data.full_name,
        assigned_role: data.role,
      },
    });
    if (error || !invited?.user) {
      throw new Response(error?.message ?? "Could not invite user", { status: 400 });
    }
    const uid = invited.user.id;

    // Profile + role are created by handle_new_user trigger using assigned_role,
    // but we also do an explicit upsert in case the trigger ordering changes.
    await supabaseAdmin.from("profiles").upsert(
      {
        user_id: uid,
        full_name: data.full_name,
        email_public: data.email,
        referral_slug: `r-${uid.replace(/-/g, "").slice(0, 8)}`,
      },
      { onConflict: "user_id" },
    );
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: uid, role: data.role }, { onConflict: "user_id,role" });

    return {
      id: uid,
      email: data.email,
      created_at: invited.user.created_at,
      last_sign_in_at: null,
      email_confirmed_at: null,
      confirmed: false,
      invited_at: (invited.user as any).invited_at ?? new Date().toISOString(),
      banned_until: null,
      roles: [data.role],
      profile: {
        user_id: uid,
        full_name: data.full_name,
        brokerage_name: null,
        referral_slug: null,
        phone: null,
      },
      packet_count: 0,
    };
  });

const ResendSchema = z.object({ user_id: z.string().uuid() });

export const adminResendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResendSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const { data: u, error: getErr } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (getErr || !u?.user?.email) {
      throw new Response("User not found", { status: 404 });
    }

    const redirectTo = `${siteOriginFromRequest()}/login?welcome=1`;
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(u.user.email, {
      redirectTo,
      data: u.user.user_metadata ?? {},
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

const SetRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(ASSIGNABLE_ROLES),
});

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    // Demoting from super_admin? Make sure we keep at least one.
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    const wasSuper = (existing ?? []).some((r) => r.role === "super_admin");
    if (wasSuper && data.role !== "super_admin") {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((count ?? 0) <= 1) {
        throw new Response("Cannot remove the last Super Admin", { status: 400 });
      }
    }

    // Replace any assignable role with the new single role for this user.
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .in("role", ASSIGNABLE_ROLES as unknown as AssignableRole[]);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });

    return { ok: true };
  });

const SetActiveSchema = z.object({
  user_id: z.string().uuid(),
  active: z.boolean(),
});

export const adminSetUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    if (!data.active && data.user_id === context.userId) {
      throw new Response("You cannot deactivate your own account", { status: 400 });
    }

    if (!data.active) {
      // Block deactivating the last active super admin.
      const { data: superRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");
      const superIds = (superRows ?? []).map((r) => r.user_id);
      if (superIds.includes(data.user_id)) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const activeSupers = (users?.users ?? []).filter(
          (u) =>
            superIds.includes(u.id) &&
            !((u as any).banned_until && new Date((u as any).banned_until) > new Date()),
        );
        if (activeSupers.length <= 1) {
          throw new Response("Cannot deactivate the last active Super Admin", {
            status: 400,
          });
        }
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.active ? "none" : "876000h",
    } as any);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

const ResetPwSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(128),
});

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResetPwSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

const DeleteUserSchema = z.object({ user_id: z.string().uuid() });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.user_id === context.userId) {
      throw new Response("You cannot delete your own account", { status: 400 });
    }
    // Block deleting the last super admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if ((roles ?? []).some((r) => r.role === "super_admin")) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((count ?? 0) <= 1) {
        throw new Response("Cannot delete the last Super Admin", { status: 400 });
      }
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

// ----- KPI metrics -----
const RangeSchema = z.object({
  days: z.number().int().min(1).max(730).default(30),
  realtor_id: z.string().uuid().nullable().optional(),
  town_id: z.string().uuid().nullable().optional(),
  scope: z.enum(["admin", "self"]).default("admin"),
});

export const adminGetMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.scope === "admin") await assertAdminTier(context.userId);

    const days = data.days;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);

    const isoStart = start.toISOString();
    const isoEnd = end.toISOString();
    const isoPrevStart = prevStart.toISOString();
    const isoPrevEnd = start.toISOString();

    const realtorFilter = data.scope === "self" ? context.userId : (data.realtor_id ?? null);

    const buildEventsQuery = (from: string, to: string) => {
      let q = supabaseAdmin
        .from("packet_events")
        .select(
          "event_type, source, device, ip_country, ip_region, ip_city, created_at, packet_id, realtor_id, town_id, metadata",
        )
        .gte("created_at", from)
        .lt("created_at", to);
      if (realtorFilter) q = q.eq("realtor_id", realtorFilter);
      if (data.town_id) q = q.eq("town_id", data.town_id);
      return q;
    };

    const buildPacketsQuery = (from: string, to: string) => {
      let q = supabaseAdmin
        .from("packets")
        .select("id, realtor_id, town_id, created_at, pdf_download_count")
        .gte("created_at", from)
        .lt("created_at", to);
      if (realtorFilter) q = q.eq("realtor_id", realtorFilter);
      if (data.town_id) q = q.eq("town_id", data.town_id);
      return q;
    };

    const [{ data: events }, { data: prevEvents }, { data: packetsCur }, { data: packetsPrev }] =
      await Promise.all([
        buildEventsQuery(isoStart, isoEnd),
        buildEventsQuery(isoPrevStart, isoPrevEnd),
        buildPacketsQuery(isoStart, isoEnd),
        buildPacketsQuery(isoPrevStart, isoPrevEnd),
      ]);

    const E = events ?? [];
    const PE = prevEvents ?? [];
    const Pk = packetsCur ?? [];
    const PPk = packetsPrev ?? [];

    const countBy = (rows: any[], type: string) => rows.filter((r) => r.event_type === type).length;

    const totals = {
      packets: Pk.length,
      pdfs: countBy(E, "pdf_downloaded"),
      qr: countBy(E, "qr_scanned"),
      views: countBy(E, "landing_view"),
      referrals: countBy(E, "referral_click"),
      bizClicks: countBy(E, "business_click") + countBy(E, "sponsor_click"),
    };
    const prev = {
      packets: PPk.length,
      pdfs: countBy(PE, "pdf_downloaded"),
      qr: countBy(PE, "qr_scanned"),
      views: countBy(PE, "landing_view"),
      referrals: countBy(PE, "referral_click"),
      bizClicks: countBy(PE, "business_click") + countBy(PE, "sponsor_click"),
    };

    const dayKey = (d: string) => new Date(d).toISOString().slice(0, 10);
    const days_arr: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days_arr.push(d.toISOString().slice(0, 10));
    }
    const series = days_arr.map((day) => {
      const today = E.filter((e) => dayKey(e.created_at) === day);
      const pksToday = Pk.filter((p) => dayKey(p.created_at) === day);
      return {
        day,
        packets: pksToday.length,
        pdfs: countBy(today, "pdf_downloaded"),
        qr: countBy(today, "qr_scanned"),
        views: countBy(today, "landing_view"),
        referrals: countBy(today, "referral_click"),
      };
    });

    const sourceMap: Record<string, number> = {};
    for (const e of E) sourceMap[e.source] = (sourceMap[e.source] ?? 0) + 1;
    const sources = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

    const deviceMap: Record<string, number> = {};
    for (const e of E) deviceMap[e.device] = (deviceMap[e.device] ?? 0) + 1;
    const devices = Object.entries(deviceMap).map(([name, value]) => ({ name, value }));

    const geoMap = new Map<string, number>();
    for (const e of E) {
      if (!e.ip_city && !e.ip_region) continue;
      const key = `${e.ip_city ?? "?"}, ${e.ip_region ?? ""}`.replace(/, $/, "");
      geoMap.set(key, (geoMap.get(key) ?? 0) + 1);
    }
    const geo = Array.from(geoMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const bizCounts = new Map<string, { name: string; count: number }>();
    for (const e of E) {
      if (e.event_type !== "business_click" && e.event_type !== "sponsor_click") continue;
      const id = (e.metadata as any)?.business_id;
      const name = (e.metadata as any)?.name ?? "Unknown";
      if (!id) continue;
      const cur = bizCounts.get(id) ?? { name, count: 0 };
      cur.count += 1;
      bizCounts.set(id, cur);
    }
    const topBusinesses = Array.from(bizCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    let topRealtors: { name: string; packets: number; views: number; referrals: number }[] = [];
    if (data.scope === "admin") {
      const realtorAgg = new Map<string, { packets: number; views: number; referrals: number }>();
      for (const p of Pk) {
        const cur = realtorAgg.get(p.realtor_id) ?? { packets: 0, views: 0, referrals: 0 };
        cur.packets += 1;
        realtorAgg.set(p.realtor_id, cur);
      }
      for (const e of E) {
        if (!e.realtor_id) continue;
        const cur = realtorAgg.get(e.realtor_id) ?? { packets: 0, views: 0, referrals: 0 };
        if (e.event_type === "landing_view") cur.views += 1;
        if (e.event_type === "referral_click") cur.referrals += 1;
        realtorAgg.set(e.realtor_id, cur);
      }
      const ids = Array.from(realtorAgg.keys());
      if (ids.length) {
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        const nameById = new Map((profs ?? []).map((p) => [p.user_id, p.full_name ?? "—"]));
        topRealtors = ids
          .map((id) => ({
            name: nameById.get(id) ?? "—",
            ...realtorAgg.get(id)!,
          }))
          .sort((a, b) => b.referrals - a.referrals || b.views - a.views)
          .slice(0, 10);
      }
    }

    const townAgg = new Map<string, { packets: number; views: number }>();
    for (const p of Pk) {
      if (!p.town_id) continue;
      const cur = townAgg.get(p.town_id) ?? { packets: 0, views: 0 };
      cur.packets += 1;
      townAgg.set(p.town_id, cur);
    }
    for (const e of E) {
      if (!e.town_id || e.event_type !== "landing_view") continue;
      const cur = townAgg.get(e.town_id) ?? { packets: 0, views: 0 };
      cur.views += 1;
      townAgg.set(e.town_id, cur);
    }
    let topTowns: { name: string; packets: number; views: number }[] = [];
    const townIds = Array.from(townAgg.keys());
    if (townIds.length) {
      const { data: towns } = await supabaseAdmin
        .from("towns")
        .select("id, name")
        .in("id", townIds);
      const nameById = new Map((towns ?? []).map((t) => [t.id, t.name]));
      topTowns = townIds
        .map((id) => ({
          name: nameById.get(id) ?? "—",
          ...townAgg.get(id)!,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    }

    const funnel = [
      { stage: "Packets created", value: totals.packets },
      { stage: "PDFs downloaded", value: totals.pdfs },
      { stage: "QR scans", value: totals.qr },
      { stage: "Landing views", value: totals.views },
      { stage: "Referral clicks", value: totals.referrals },
    ];

    return {
      range: { days, start: isoStart, end: isoEnd },
      totals,
      prev,
      series,
      sources,
      devices,
      geo,
      topBusinesses,
      topRealtors,
      topTowns,
      funnel,
    };
  });

// Per-packet event timeline (realtor or admin)
export const getPacketTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ packet_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: packet } = await supabaseAdmin
      .from("packets")
      .select("id, realtor_id")
      .eq("id", data.packet_id)
      .maybeSingle();
    if (!packet) throw new Response("Not found", { status: 404 });
    if (packet.realtor_id !== context.userId) {
      await assertAdminTier(context.userId);
    }

    const { data: events } = await supabaseAdmin
      .from("packet_events")
      .select("*")
      .eq("packet_id", data.packet_id)
      .order("created_at", { ascending: false })
      .limit(500);

    const counts = {
      pdf: 0,
      qr: 0,
      views: 0,
      referrals: 0,
      bizClicks: 0,
    };
    for (const e of events ?? []) {
      if (e.event_type === "pdf_downloaded") counts.pdf += 1;
      else if (e.event_type === "qr_scanned") counts.qr += 1;
      else if (e.event_type === "landing_view") counts.views += 1;
      else if (e.event_type === "referral_click") counts.referrals += 1;
      else if (e.event_type === "business_click" || e.event_type === "sponsor_click")
        counts.bizClicks += 1;
    }

    return { events: events ?? [], counts };
  });

export const adminListEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).default(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminTier(context.userId);
    const { data: events } = await supabaseAdmin
      .from("packet_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return { events: events ?? [] };
  });
