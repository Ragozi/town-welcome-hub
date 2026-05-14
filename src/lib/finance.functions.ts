import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

// ---------- Sponsor subscriptions ----------
const SubSchema = z.object({
  business_name: z.string().min(1).max(200),
  contact_email: z.string().email().nullish(),
  tier_key: z.string().max(60).nullish(),
  monthly_amount: z.number().min(0).max(100000),
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
  started_on: z.string().min(8),
  ended_on: z.string().nullish(),
  notes: z.string().max(2000).nullish(),
});

export const listSponsorSubs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("sponsor_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Response(error.message, { status: 500 });
    return data ?? [];
  });

export const createSponsorSub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SubSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("sponsor_subscriptions").insert({
      ...data,
      created_by: context.userId,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const updateSponsorSub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), patch: SubSchema.partial() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("sponsor_subscriptions")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const deleteSponsorSub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("sponsor_subscriptions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

// ---------- Expenses ----------
const ExpenseSchema = z.object({
  category: z.string().min(1).max(60),
  vendor: z.string().max(200).nullish(),
  description: z.string().max(500).nullish(),
  amount: z.number().min(0).max(1000000),
  occurred_on: z.string().min(8),
  is_recurring: z.boolean().default(false),
  recurring_interval: z.enum(["monthly", "yearly"]).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("expenses")
      .select("*")
      .order("occurred_on", { ascending: false });
    if (error) throw new Response(error.message, { status: 500 });
    return data ?? [];
  });

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ExpenseSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("expenses").insert({
      ...data,
      created_by: context.userId,
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("expenses").delete().eq("id", data.id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
