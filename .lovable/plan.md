# Fix the scrape: insert failures + invisible job logs

## What the logs prove

- `debug_logs` shows 15 successful `firecrawlSearch` calls per click (one per core category) — Firecrawl is healthy.
- `scraped_businesses` is **empty** (0 rows total). Every upsert fails.
- No `scrapeCounty` / `scrapeTown` parent log entry exists in the feed — only child search calls.

## Root cause

The DB still has a **partial** unique index:

```
UNIQUE INDEX (town_id, website) WHERE website IS NOT NULL
```

PostgREST's `.upsert({ onConflict: "town_id,website" })` requires a non-partial unique constraint. Each insert returns *"no unique or exclusion constraint matching the ON CONFLICT specification"*. The handler counts it as `skipped` and (in `scrapeCounty`) pushes the message into `errors[]` — but neither function is wrapped in `withDebugLog`, so those counts never reach the Debug Lab.

## Fix

### 1. Migration — real unique constraint

```sql
DROP INDEX IF EXISTS scraped_businesses_town_website_idx;
ALTER TABLE scraped_businesses
  ADD CONSTRAINT scraped_businesses_town_website_key
  UNIQUE (town_id, website);
```

Nullable `website` is fine: Postgres treats NULLs as distinct in UNIQUE constraints, so rows with no website still insert.

### 2. Wrap both scrape jobs in `withDebugLog`

In `src/lib/scraped.functions.ts`, wrap the body of `scrapeTown` and `scrapeCounty` so a single parent log appears in the feed with the full summary:

```ts
return withDebugLog(
  {
    event_type: "scrape",
    function_name: "scrapeCounty",
    input: { townId, county: town.county, state: town.state, categories: coreCats.length, limit },
  },
  async () => {
    // existing loop …
    return { inserted, skipped, errors, searches, skipReasons };
  },
);
```

Then in the Debug Lab you'll see one `scrapeCounty` row (with `inserted/skipped/errors`) above its 15 child `firecrawlSearch` rows.

### 3. Stop swallowing `insErr` in `scrapeTown`

Match `scrapeCounty`'s pattern — push `insErr.message` into `errors[]` and bump a `db_error` counter in `skipReasons`, instead of just `skipped += 1`.

### 4. Surface skip reasons in the toast + summary panel

The library page already renders a "Last scrape summary" panel — once the parent job returns `skipReasons` and `errors[]` populated, it'll show *why* each row was dropped (`aggregator_site`, `duplicate_or_updated`, `missing_url`, `db_error`).

## Verification

After the migration:

1. Click "Scrape County" on Grafton.
2. Expect ~150 rows inserted (15 categories × ~10 results, minus aggregator filters).
3. Debug Lab should show a single `scrapeCounty` parent entry with `{ inserted: ~120, skipped: ~30, errors: [] }` followed by 15 `firecrawlSearch` children.
4. `SELECT count(*) FROM scraped_businesses` should jump from 0 to ~120+.

## Out of scope (next turn)

- State → County → Town redesign of `/admin/towns`
- Seeding more SE Wisconsin towns
- Wiring "Mark closed/open" verification buttons in the library UI  
  
**What the support bundle told me**
  - **Firecrawl is healthy**: every search returned 10 quality results in 1-3 seconds — your API key works, credits are being spent. The Firecrawl /v2/search integration is solid.
  - `scraped_businesses: 0`: zero rows landed because every result threw `"there is no unique or exclusion constraint matching the ON CONFLICT specification"`.
  - `towns: 8`: my 60-town seed migration hadn't run at bundle-time (only 3 original + 5 you/Lovable added).
  ### **What I changed**
  Stopped using PostgREST's `.upsert({ onConflict: "town_id,website" })` entirely. New helper `insertOrUpdateScrapedBusiness()` does:
  1. `SELECT id FROM scraped_businesses WHERE town_id=? AND website=?`
  2. If found → `UPDATE` only the fields the scrape produces (preserves admin-set status, excluded_reason, address, phone, logo_url, promoted_business_id)
  3. If not found → `INSERT`
  Two queries instead of one upsert, but works against **any** schema state — no dependency on which migrations have applied. Errors now bubble through with their PostgREST message into the returned `errors[]` so admins see the actual cause if a write fails.
  ### **Two things you should check before re-scraping**
  1. **Confirm migrations applied.** The newly-regenerated `types.ts` (from Lovable's last push) shows `source_zip` and `source_county` columns exist, which suggests my migrations DID land — but `towns` was still at 8 in your bundle. Open Supabase SQL editor and run:
    ```
    SELECT count(*) FROM towns;
    ```
    `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'scraped_businesses';`
    If towns < 50, my seed (`34a0bee5`) didn't apply — Lovable's deploy pipeline may need a kick.
  2. **Lovable just added business verification.** I noticed `businesses.last_verified_at`, `businesses.verification_note`, `businesses.verification_status` in the regen'd types — Lovable is building a verification flow. **My** `verifyUrlLive()` **in scrapeCounty might collide with whatever Lovable is doing.** Worth aligning before either side keeps building — prompt Lovable to tell you what its verification flow does and how it should interact with the scrape.
  ### **On the Firecrawl docs you linked**
  - **[/v2/search](https://docs.firecrawl.dev/features/search)** — what we're using now. Returns search results with title/url/description. ✓ Working great.
  - **[/v2/scrape](https://docs.firecrawl.dev/features/scrape)** — single-URL deep scrape returning structured page data (markdown, links, JSON via schema). Best use: **per-business enrichment** — after we pick a winner, scrape its homepage to extract phone/address/hours/social links into the `businesses` table.
  - **[/v2/crawl](https://docs.firecrawl.dev/features/crawl)** — recursively crawl a whole site. Probably overkill for our needs; useful only for sponsor onboarding (e.g., pull menu pages from a restaurant's whole site).
  - **[/v2/interact (actions)](https://docs.firecrawl.dev/features/interact)** — JS actions (click, type, scroll) for SPAs that lazy-load content. Useful for booking sites or franchise locators that hide info behind interactions.
  **Recommended next moves** when you're ready (not part of this commit):
  - Wire `/v2/scrape` into the "Promote to sponsor" flow so when an admin promotes a scraped result, we extract the business's real phone/address/hours from their site
  - Wire `/v2/scrape` (instead of my plain `fetch`) into the liveness check for sites that block bots — costs 1 credit per check but kills the "site returns 403 to our user agent" false negatives
  ### **To unblock right now**
  1. Verify migrations in Supabase SQL editor (queries above)
  2. Re-run **Deep scrape (county)** on `/admin/towns/grafton/library` — the manual upsert in `b66dc21` will succeed even if the unique index isn't yet in place
  3. Watch the Debug Lab — you should see results land in Pending (live URLs) and Excluded (404'd / closed-marked URLs) with proper counts  
    
    
