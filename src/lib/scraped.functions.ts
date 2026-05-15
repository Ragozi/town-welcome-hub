import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { firecrawlSearch } from "./firecrawl.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

function hostFrom(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ----- Scrape town -----
export const scrapeTown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      townId: z.string().uuid(),
      categorySlugs: z.array(z.string()).optional(),
      limit: z.number().min(1).max(20).default(8),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: town, error: tErr } = await supabaseAdmin
      .from("towns")
      .select("id, name, state")
      .eq("id", data.townId)
      .maybeSingle();
    if (tErr || !town) throw new Response("Town not found", { status: 404 });

    let catQuery = supabaseAdmin.from("categories").select("id, slug, name").order("display_order");
    if (data.categorySlugs && data.categorySlugs.length > 0) {
      catQuery = catQuery.in("slug", data.categorySlugs);
    }
    const { data: categories } = await catQuery;
    if (!categories || categories.length === 0) {
      return { inserted: 0, skipped: 0, errors: [] as string[] };
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const cat of categories) {
      const query = `best ${cat.name.toLowerCase()} in ${town.name}, ${town.state}`;
      try {
        const results = await firecrawlSearch(query, { limit: data.limit });
        for (const r of results) {
          const website = r.url;
          const host = hostFrom(website);
          if (!host) {
            skipped += 1;
            continue;
          }
          // Skip aggregator/review sites — we want the business' own site
          if (/yelp|tripadvisor|facebook|instagram|google\.|yellowpages|mapquest|allmenus/i.test(host)) {
            skipped += 1;
            continue;
          }

          const name = (r.title ?? host).split(/[|\-–·]/)[0].trim().slice(0, 200);

          const { error: insErr } = await supabaseAdmin
            .from("scraped_businesses")
            .upsert(
              {
                town_id: town.id,
                category_id: cat.id,
                source: "firecrawl_search",
                source_url: website,
                source_query: query,
                name,
                website,
                description: r.description ?? null,
                raw: r as never,
                last_scraped_at: new Date().toISOString(),
              },
              { onConflict: "town_id,website", ignoreDuplicates: false },
            );
          if (insErr) {
            // Unique-index expression conflict can throw; treat as skip
            skipped += 1;
          } else {
            inserted += 1;
          }
        }
      } catch (e) {
        errors.push(`${cat.name}: ${(e as Error).message}`);
      }
    }

    return { inserted, skipped, errors };
  });

// ----- List for a town -----
export const listScrapedForTown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      townId: z.string().uuid(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("scraped_businesses")
      .select("id, town_id, category_id, source, source_url, source_query, name, address, phone, website, description, logo_url, status, excluded_reason, promoted_business_id, last_scraped_at")
      .eq("town_id", data.townId)
      .order("status")
      .order("name");
    const { data: cats } = await supabaseAdmin
      .from("categories")
      .select("id, slug, name")
      .order("display_order");
    return { rows: rows ?? [], categories: cats ?? [] };
  });

// ----- Set status -----
export const setScrapedStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      ids: z.array(z.string().uuid()).min(1).max(200),
      status: z.enum(["pending", "included", "excluded"]),
      reason: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch = {
      status: data.status,
      excluded_reason: data.status === "excluded" ? (data.reason ?? null) : null,
    };
    const { error } = await supabaseAdmin
      .from("scraped_businesses")
      .update(patch)
      .in("id", data.ids);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

// ----- Promote to sponsor -----
export const promoteToBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      sponsor_tier: z.enum(["none", "bronze", "silver", "gold", "s_tier"]),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("scraped_businesses")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Response("Not found", { status: 404 });
    if (!row.category_id) throw new Response("Set a category first", { status: 400 });

    const { data: biz, error: bErr } = await supabaseAdmin
      .from("businesses")
      .insert({
        town_id: row.town_id,
        category_id: row.category_id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        website: row.website,
        description: row.description,
        logo_url: row.logo_url,
        sponsor_tier: data.sponsor_tier,
        scraped_from: row.source_url,
        last_scraped: row.last_scraped_at,
      })
      .select("id")
      .single();
    if (bErr) throw new Response(bErr.message, { status: 500 });

    await supabaseAdmin
      .from("scraped_businesses")
      .update({ status: "promoted", promoted_business_id: biz.id })
      .eq("id", row.id);

    return { businessId: biz.id };
  });

// ----- List towns (admin) -----
export const adminListTowns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: towns } = await supabaseAdmin
      .from("towns")
      .select("id, slug, name, state")
      .order("name");
    const { data: counts } = await supabaseAdmin
      .from("scraped_businesses")
      .select("town_id, status");
    const byTown = new Map<string, { pending: number; included: number; excluded: number; promoted: number }>();
    for (const t of towns ?? []) {
      byTown.set(t.id, { pending: 0, included: 0, excluded: 0, promoted: 0 });
    }
    for (const c of counts ?? []) {
      const b = byTown.get(c.town_id);
      if (!b) continue;
      const k = c.status as "pending" | "included" | "excluded" | "promoted";
      b[k] += 1;
    }
    return (towns ?? []).map((t) => ({ ...t, counts: byTown.get(t.id)! }));
  });

// ----- Town businesses preview (for New Handbook flow) -----
export const previewTownBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      townId: z.string().uuid(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { data: cats } = await supabaseAdmin
      .from("categories")
      .select("id, slug, name")
      .order("display_order");
    const { data: businesses } = await supabaseAdmin
      .from("businesses")
      .select("id, name, category_id, sponsor_tier, address, website, logo_url, subcategory")
      .eq("town_id", data.townId);
    return { categories: cats ?? [], businesses: businesses ?? [] };
  });

// ----- Generate / regenerate QA handbook -----
export const generateQaHandbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    // Pick a town that has at least one business
    const { data: anyBiz } = await supabaseAdmin
      .from("businesses")
      .select("town_id")
      .limit(1)
      .maybeSingle();
    const { data: town } = anyBiz?.town_id
      ? await supabaseAdmin.from("towns").select("*").eq("id", anyBiz.town_id).maybeSingle()
      : await supabaseAdmin.from("towns").select("*").order("name").limit(1).maybeSingle();
    if (!town) throw new Response("No towns configured", { status: 400 });

    const slug = "qa-sample";
    const payload = {
      realtor_id: context.userId,
      town_id: town.id,
      slug,
      buyer_first_name: "Sample",
      buyer_last_name: "Buyer",
      buyer_email: null,
      address: `123 Demo Lane, ${town.name}, ${town.state}`,
      closing_date: null,
      welcome_note:
        "Welcome to your QA handbook! This is a sample packet used to preview layout and content end-to-end.",
      has_kids: true,
      has_pets: true,
      interests: ["Coffee", "Hiking", "Foodie"],
      lifestyle_tags: ["First-time homebuyers"],
      home_photo_url: null,
      status: "generated" as const,
    };

    const { data: existing } = await supabaseAdmin
      .from("packets")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabaseAdmin
        .from("packets")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id, slug, updated_at")
        .single();
      if (error) throw new Response(error.message, { status: 500 });
      return updated;
    }

    const { data: created, error } = await supabaseAdmin
      .from("packets")
      .insert(payload)
      .select("id, slug, updated_at")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    return created;
  });

export const getQaHandbook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("packets")
      .select("id, slug, updated_at, town_id")
      .eq("slug", "qa-sample")
      .maybeSingle();
    return data;
  });
