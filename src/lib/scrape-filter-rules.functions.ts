import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

const RULE_TYPES = ["domain_contains", "url_regex", "title_regex", "url_suffix"] as const;
type RuleType = (typeof RULE_TYPES)[number];

type Rule = {
  id: string;
  rule_type: RuleType;
  pattern: string;
  reason_label: string;
  enabled: boolean;
  notes: string | null;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
};

function validatePattern(rule_type: RuleType, pattern: string): string | null {
  if (!pattern.trim()) return "Pattern is required";
  if (rule_type === "url_regex" || rule_type === "title_regex") {
    try {
      new RegExp(pattern);
    } catch (e) {
      return `Invalid regex: ${(e as Error).message}`;
    }
  }
  return null;
}

const baseRuleInput = z.object({
  rule_type: z.enum(RULE_TYPES),
  pattern: z.string().min(1).max(500),
  reason_label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().optional(),
  enabled: z.boolean().optional(),
});

export const listScrapeFilterRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("scrape_filter_rules")
      .select("*")
      .order("hit_count", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Rule[];
  });

export const createScrapeFilterRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => baseRuleInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const err = validatePattern(data.rule_type, data.pattern);
    if (err) throw new Error(err);
    const { data: row, error } = await supabaseAdmin
      .from("scrape_filter_rules")
      .insert({
        rule_type: data.rule_type,
        pattern: data.pattern,
        reason_label: data.reason_label,
        notes: data.notes ?? null,
        enabled: data.enabled ?? true,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as Rule;
  });

export const updateScrapeFilterRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    baseRuleInput.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.rule_type && data.pattern) {
      const err = validatePattern(data.rule_type, data.pattern);
      if (err) throw new Error(err);
    }
    const { id, ...patch } = data;
    const { data: row, error } = await supabaseAdmin
      .from("scrape_filter_rules")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as Rule;
  });

export const deleteScrapeFilterRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("scrape_filter_rules")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkSetEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ ids: z.array(z.string().uuid()).min(1).max(500), enabled: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("scrape_filter_rules")
      .update({ enabled: data.enabled })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

function matchRule(
  rule: Pick<Rule, "rule_type" | "pattern">,
  url: string,
  title: string,
): boolean {
  const lcUrl = url.toLowerCase();
  switch (rule.rule_type) {
    case "domain_contains": {
      try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
        return host.includes(rule.pattern.toLowerCase());
      } catch {
        return false;
      }
    }
    case "url_suffix":
      return lcUrl.endsWith(rule.pattern.toLowerCase());
    case "url_regex":
      try {
        return new RegExp(rule.pattern, "i").test(url);
      } catch {
        return false;
      }
    case "title_regex":
      try {
        return new RegExp(rule.pattern, "i").test(title);
      } catch {
        return false;
      }
  }
}

export const testScrapeFilter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ url: z.string().url().max(2048), title: z.string().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rules, error } = await supabaseAdmin
      .from("scrape_filter_rules")
      .select("id, rule_type, pattern, reason_label")
      .eq("enabled", true)
      .order("hit_count", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);

    const title = data.title ?? "";
    for (const r of (rules ?? []) as Array<
      Pick<Rule, "id" | "rule_type" | "pattern" | "reason_label">
    >) {
      if (matchRule(r, data.url, title)) {
        return {
          passed: false,
          matchedRule: {
            id: r.id,
            rule_type: r.rule_type,
            pattern: r.pattern,
            reason_label: r.reason_label,
          },
        };
      }
    }
    return { passed: true, matchedRule: null };
  });
