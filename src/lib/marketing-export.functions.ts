import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withDebugLog } from "./debug-log.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

const inputSchema = z.object({
  town_slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
  town_id: z.string().uuid().optional(),
  state: z.string().min(2).max(2).regex(/^[A-Z]{2}$/).optional(),
  county: z.string().min(1).max(120).optional(),
  category_slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
  include_unverified: z.boolean().optional().default(true),
  format: z.enum(["json", "csv"]).optional().default("json"),
  limit: z.number().int().min(1).max(5000).optional().default(1000),
});

type Lead = {
  id: string;
  name: string;
  website: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  category: { slug: string; name: string } | null;
  town: { slug: string; name: string; county: string; state: string };
  verification_status: string;
  last_scraped_at: string;
  source_url: string | null;
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(leads: Lead[]): string {
  const header = [
    "name", "website", "phone", "address", "category",
    "town", "county", "state", "verification_status",
    "last_scraped_at", "source_url",
  ];
  const rows = leads.map((l) => [
    l.name, l.website, l.phone, l.address,
    l.category?.name ?? "",
    l.town.name, l.town.county, l.town.state,
    l.verification_status, l.last_scraped_at, l.source_url,
  ].map(csvEscape).join(","));
  return [header.join(","), ...rows].join("\n");
}

export const exportMarketingLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    return withDebugLog(
      {
        event_type: "other",
        function_name: "exportMarketingLeads",
        user_id: context.userId,
        input: data,
      },
      async () => {
        // Resolve town_slug → town_id
        let townId = data.town_id ?? null;
        if (!townId && data.town_slug) {
          const { data: t } = await supabaseAdmin
            .from("towns")
            .select("id")
            .eq("slug", data.town_slug)
            .maybeSingle();
          townId = t?.id ?? null;
          if (!townId) throw new Error(`Town not found: ${data.town_slug}`);
        }

        let catId: string | null = null;
        if (data.category_slug) {
          const { data: c } = await supabaseAdmin
            .from("categories")
            .select("id")
            .eq("slug", data.category_slug)
            .maybeSingle();
          catId = c?.id ?? null;
        }

        const verStatuses = data.include_unverified
          ? ["open", "unknown"]
          : ["open"];

        let q = supabaseAdmin
          .from("scraped_businesses")
          .select(
            `id, name, website, phone, address, description,
             verification_status, last_scraped_at, source_url,
             towns!inner ( slug, name, county, state ),
             categories ( slug, name )`,
          )
          .eq("status", "included")
          .in("verification_status", verStatuses)
          .not("website", "is", null)
          .order("name", { ascending: true })
          .limit(data.limit);

        if (townId) q = q.eq("town_id", townId);
        if (catId) q = q.eq("category_id", catId);
        if (data.state) q = q.eq("towns.state", data.state);
        if (data.county) q = q.eq("towns.county", data.county);

        const { data: rows, error } = await q;
        if (error) throw new Error(error.message);

        const leads: Lead[] = (rows ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          website: r.website,
          phone: r.phone,
          address: r.address,
          description: r.description,
          category: r.categories
            ? { slug: r.categories.slug, name: r.categories.name }
            : null,
          town: {
            slug: r.towns.slug,
            name: r.towns.name,
            county: r.towns.county,
            state: r.towns.state,
          },
          verification_status: r.verification_status,
          last_scraped_at: r.last_scraped_at,
          source_url: r.source_url,
        }));

        const base = {
          generated_at: new Date().toISOString(),
          filters: data,
          count: leads.length,
        };

        if (data.format === "csv") {
          return { ...base, csv: toCsv(leads), leads: [] as Lead[] };
        }
        return { ...base, csv: null as string | null, leads };
      },
    );
  });
