import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withDebugLog } from "@/lib/debug-log.server";
import { firecrawlSearch } from "./firecrawl.server";

type SkipReasons = {
  missing_url: number;
  aggregator_site: number;
  duplicate_or_updated: number;
  db_error: number;
};

function emptySkipReasons(): SkipReasons {
  return { missing_url: 0, aggregator_site: 0, duplicate_or_updated: 0, db_error: 0 };
}

const AGGREGATOR_RE = /yelp|tripadvisor|facebook|instagram|google\.|yellowpages|mapquest|allmenus/i;

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
// Iterates one Firecrawl search per (category × zip code). The query is the
// strongest signal Firecrawl/Google use for geographic targeting, so we put
// the zip directly in the query string rather than relying on Firecrawl's
// `location` param (which only accepts country/region granularity).
//
// Cost: a town with 5 zips × 10 categories = 50 searches per click,
// charged at 2 Firecrawl credits per 10 results.
export const scrapeTown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      townId: z.string().uuid(),
      categorySlugs: z.array(z.string()).optional(),
      zipCodes: z.array(z.string()).optional(),
      limit: z.number().min(1).max(20).default(8),
    }).parse,
  )
  .handler(async ({ data, context }) =>
    withDebugLog(
      {
        event_type: "scrape",
        function_name: "scrapeTown",
        user_id: context.userId,
        input: { townId: data.townId, categorySlugs: data.categorySlugs, zipCodes: data.zipCodes, limit: data.limit },
      },
      async () => {
        await assertAdmin(context.userId);

        const { data: town, error: tErr } = await supabaseAdmin
          .from("towns")
          .select("id, name, state, county, zip_codes")
          .eq("id", data.townId)
          .maybeSingle();
        if (tErr || !town) throw new Response("Town not found", { status: 404 });

        let catQuery = supabaseAdmin
          .from("categories")
          .select("id, slug, name")
          .order("display_order");
        if (data.categorySlugs && data.categorySlugs.length > 0) {
          catQuery = catQuery.in("slug", data.categorySlugs);
        }
        const { data: categories } = await catQuery;
        if (!categories || categories.length === 0) {
          return {
            town: { id: town.id, name: town.name, state: town.state, county: town.county },
            inserted: 0,
            skipped: 0,
            skipReasons: emptySkipReasons(),
            errors: [] as string[],
            searches: 0,
          };
        }

        const townZips = (town.zip_codes ?? []).filter(
          (z): z is string => typeof z === "string" && z.length > 0,
        );
        const zips = data.zipCodes && data.zipCodes.length > 0 ? data.zipCodes : townZips;
        const targets: { zip: string | null; locationLabel: string }[] =
          zips.length > 0
            ? zips.map((zip) => ({ zip, locationLabel: `${town.name}, ${town.state} ${zip}` }))
            : [{ zip: null, locationLabel: `${town.name}, ${town.state}` }];

        let inserted = 0;
        let searches = 0;
        const skipReasons = emptySkipReasons();
        const errors: string[] = [];

        for (const cat of categories) {
          for (const target of targets) {
            const query = `best ${cat.name.toLowerCase()} in ${target.locationLabel}`;
            try {
              const results = await firecrawlSearch(query, { limit: data.limit });
              searches += 1;
              for (const r of results) {
                const website = r.url;
                const host = hostFrom(website);
                if (!host) {
                  skipReasons.missing_url += 1;
                  continue;
                }
                if (AGGREGATOR_RE.test(host)) {
                  skipReasons.aggregator_site += 1;
                  continue;
                }

                const name = (r.title ?? host).split(/[|\-–·]/)[0].trim().slice(0, 200);

                const { data: upserted, error: insErr } = await supabaseAdmin
                  .from("scraped_businesses")
                  .upsert(
                    {
                      town_id: town.id,
                      category_id: cat.id,
                      source: "firecrawl_search",
                      source_url: website,
                      source_query: query,
                      source_zip: target.zip,
                      name,
                      website,
                      description: r.description ?? null,
                      raw: r as never,
                      last_scraped_at: new Date().toISOString(),
                    },
                    { onConflict: "town_id,website", ignoreDuplicates: false },
                  )
                  .select("id, created_at, updated_at");

                if (insErr) {
                  skipReasons.db_error += 1;
                  errors.push(`${cat.name} @ ${target.zip ?? "town"} (${host}): ${insErr.message}`);
                } else if (upserted && upserted[0]) {
                  const row = upserted[0];
                  const isNew = row.created_at === row.updated_at;
                  if (isNew) inserted += 1;
                  else skipReasons.duplicate_or_updated += 1;
                } else {
                  skipReasons.duplicate_or_updated += 1;
                }
              }
            } catch (e) {
              errors.push(`${cat.name} @ ${target.zip ?? "town"}: ${(e as Error).message}`);
            }
          }
        }

        const skipped =
          skipReasons.missing_url +
          skipReasons.aggregator_site +
          skipReasons.duplicate_or_updated +
          skipReasons.db_error;

        return {
          town: { id: town.id, name: town.name, state: town.state, county: town.county },
          inserted,
          skipped,
          skipReasons,
          errors,
          searches,
        };
      },
    ),
  );

// ----- Scrape county (core_business_categories deep scrape) -----
// Iterates the canonical `core_business_categories` (the same list the gap
// analysis grades against) and fires one Firecrawl search per core category
// at the COUNTY level (e.g. "best pizza in Ozaukee County, WI"). Use this
// for categories where buyers reasonably drive across town lines
// (orthodontist, urgent care, hardware). For hyperlocal categories
// (coffee/pizza/ice cream), the per-zip `scrapeTown` is the better tool.
//
// Results are anchored to the requesting town_id (so they show up in that
// town's library), tagged with `source_county`, and tagged with
// `source = 'firecrawl_search_county'` so we can tell them apart in analytics.
//
// Cost: one search per core_business_category (currently 15) = 15 searches
// per click, charged at 2 Firecrawl credits per 10 results.
export const scrapeCounty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      townId: z.string().uuid(),
      criticalOnly: z.boolean().default(false),
      limit: z.number().min(1).max(20).default(10),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: town, error: tErr } = await supabaseAdmin
      .from("towns")
      .select("id, name, state, county")
      .eq("id", data.townId)
      .maybeSingle();
    if (tErr || !town) throw new Response("Town not found", { status: 404 });
    if (!town.county) {
      throw new Response("Town has no county set", { status: 400 });
    }

    let coreQuery = supabaseAdmin
      .from("core_business_categories")
      .select("id, category_slug, subcategory, label, synonyms, is_critical")
      .order("display_order");
    if (data.criticalOnly) {
      coreQuery = coreQuery.eq("is_critical", true);
    }
    const { data: coreCats } = await coreQuery;
    if (!coreCats || coreCats.length === 0) {
      return { inserted: 0, skipped: 0, errors: [] as string[], searches: 0 };
    }

    // Resolve core_business_categories.category_slug → categories.id so we can
    // tag the scraped row with the right parent category for the library UI.
    const { data: cats } = await supabaseAdmin.from("categories").select("id, slug");
    const catIdBySlug = new Map((cats ?? []).map((c) => [c.slug, c.id] as const));

    let inserted = 0;
    let skipped = 0;
    let searches = 0;
    const errors: string[] = [];

    for (const core of coreCats) {
      const term = (core.synonyms && core.synonyms.length > 0 ? core.synonyms[0] : core.label)
        .toLowerCase()
        .trim();
      const query = `best ${term} in ${town.county} County, ${town.state}`;
      try {
        const results = await firecrawlSearch(query, { limit: data.limit });
        searches += 1;
        for (const r of results) {
          const website = r.url;
          const host = hostFrom(website);
          if (!host) {
            skipped += 1;
            continue;
          }
          if (
            /yelp|tripadvisor|facebook|instagram|google\.|yellowpages|mapquest|allmenus/i.test(host)
          ) {
            skipped += 1;
            continue;
          }

          const name = (r.title ?? host)
            .split(/[|\-–·]/)[0]
            .trim()
            .slice(0, 200);

          const { error: insErr } = await supabaseAdmin.from("scraped_businesses").upsert(
            {
              town_id: town.id,
              category_id: catIdBySlug.get(core.category_slug) ?? null,
              source: "firecrawl_search_county",
              source_url: website,
              source_query: query,
              source_zip: null,
              source_county: town.county,
              name,
              website,
              description: r.description ?? null,
              raw: r as never,
              last_scraped_at: new Date().toISOString(),
            },
            { onConflict: "town_id,website", ignoreDuplicates: false },
          );
          if (insErr) {
            skipped += 1;
          } else {
            inserted += 1;
          }
        }
      } catch (e) {
        errors.push(`${core.label}: ${(e as Error).message}`);
      }
    }

    return { inserted, skipped, errors, searches };
  });

// ----- Firecrawl health check -----
// Fires one tiny search to verify the API key is wired and the service is
// reachable. Surfaces in Debug Lab as a scrape event. Cheap (1 result = 2 credits).
export const firecrawlHealthCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const hasKey = !!process.env.FIRECRAWL_API_KEY;
    if (!hasKey) {
      return { ok: false, hasKey: false, message: "FIRECRAWL_API_KEY not set" } as const;
    }
    const started = Date.now();
    try {
      const results = await firecrawlSearch("hearth handbook health check", { limit: 1 });
      return {
        ok: true,
        hasKey: true,
        durationMs: Date.now() - started,
        sampleCount: results.length,
        sampleUrl: results[0]?.url ?? null,
      } as const;
    } catch (e) {
      return {
        ok: false,
        hasKey: true,
        durationMs: Date.now() - started,
        message: (e as Error).message,
      } as const;
    }
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
      .select(
        "id, town_id, category_id, source, source_url, source_query, name, address, phone, website, description, logo_url, status, excluded_reason, promoted_business_id, last_scraped_at",
      )
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
    const byTown = new Map<
      string,
      { pending: number; included: number; excluded: number; promoted: number }
    >();
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
