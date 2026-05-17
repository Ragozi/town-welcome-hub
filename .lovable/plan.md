# Plan

This needs more than a UI tweak: the scrape is returning search results, but inserts are failing silently, county-level jobs are not logged as jobs, and the town admin page does not scale beyond the small Ozaukee seed set.

## 1. Fix why nothing new appears in Pending

**Root cause:** Firecrawl search calls are succeeding, but `scraped_businesses` remains empty because the upsert conflict target does not match the database index.

- Existing code upserts with `onConflict: "town_id,website"`.
- Existing DB index is `town_id, lower(website)`.
- That mismatch makes every insert fail, then the code counts it as `skipped`.

**Changes:**
- Add a migration to replace the current expression index with a plain unique index on `(town_id, website)` where website is not null.
- Update both `scrapeTown` and `scrapeCounty` so insert/upsert errors are returned and logged, not swallowed as generic skips.
- Update the scrape success toast to show `inserted / skipped / errors / searches` so admin sees whether a run actually stored rows.

## 2. Add top-level scrape job logs, including county logs

Right now `debug_logs` mostly shows individual `firecrawlSearch` calls. There is no parent `scrapeCounty` job log, so the DB does not clearly show “county scrape started / finished / failed.”

**Changes:**
- Wrap `scrapeTown` with `withDebugLog({ function_name: "scrapeTown" })`.
- Wrap `scrapeCounty` with `withDebugLog({ function_name: "scrapeCounty" })`.
- Include town id, town name, state, county, limit, category count, search count, inserted count, skipped reasons summary, and errors in the parent log payload.
- Keep the existing lower-level `firecrawlSearch` logs so we can still inspect exact queries and raw returned URLs.

## 3. Explain skip logic in the admin UI

Current skip behavior is opaque. I’ll make it explicit.

**Current skip reasons:**
- No usable URL/host returned.
- Aggregator/review/social/map results are ignored: Yelp, TripAdvisor, Facebook, Instagram, Google, YellowPages, MapQuest, AllMenus.
- Insert/upsert DB errors were incorrectly counted as skipped — this will become a visible error.
- Duplicate website within the same town resolves through upsert rather than a brand-new row.

**Changes:**
- Track skip reasons during `scrapeTown` and `scrapeCounty` as counts, e.g. `aggregator_site`, `missing_url`, `db_error`, `duplicate_or_updated`.
- Return `skipReasons` from scrape functions.
- Show these reasons in the scrape toast and/or a small “Last scrape summary” panel in the town library page.
- Include skip summary in Debug Lab/support export logs.

## 4. Make closed/outdated businesses visible instead of pretending search is accurate

Example: `Cheel` is currently in the `businesses` table, not `scraped_businesses`, with no website and no `last_scraped`, so it appears to be manually/previously seeded. The current scraper does not verify whether existing `businesses` are still open.

**Changes:**
- Add nullable verification fields to `businesses` and `scraped_businesses`:
  - `last_verified_at`
  - `verification_status` (`unknown`, `open`, `possibly_closed`, `closed`)
  - `verification_note`
- In admin town library, show verification status next to each result/business where available.
- Do not auto-delete closed businesses. Flag them for admin review so we avoid removing something incorrectly.
- Add a simple admin action to mark a business/result as `possibly_closed` or `closed` with a note.

**Not included yet:** automatic web verification of closed status. That can be a second pass using targeted search/scrape queries like `"Cheel" "Grafton" closed` and business website checks. It should be deliberate because false positives are likely.

## 5. Redesign `/admin/towns` to scale by State → County → Town

The database currently only has 8 Ozaukee towns, so only Ozaukee shows. The page also has no structure for multi-county/multi-state growth.

**Changes:**
- Update `adminListTowns` to return `state` and `county`.
- Redesign `/admin/towns` into a scalable directory:

```text
State filter     County filter/search
WI
  Ozaukee        town cards/counts
  Milwaukee      town cards/counts
  Waukesha       town cards/counts
  ...
```

- Add URL search params for `state`, `county`, and text search so filters are shareable/bookmarkable.
- Roll up counts at state and county level.
- Keep town cards linking to the existing town library route.

## 6. Seed additional towns after the scalable UI exists

After the state/county UI is in place, add town data in a controlled migration.

Initial seed target: Southeast Wisconsin counties:
- Milwaukee
- Waukesha
- Washington
- Racine
- Kenosha
- Walworth
- plus existing Ozaukee

For each town: `slug`, `name`, `state`, `county`, `zip_codes`, `latitude`, `longitude`.

I’ll seed a practical core list first, not every municipality, unless you ask for full coverage.

# Technical details

- Use a schema migration for the unique index and verification columns.
- Use data insertion for new town seed rows, not schema migration-only assumptions.
- Keep all scrape/admin functions protected by super-admin checks.
- Do not change public packet behavior in this pass.
- Do not auto-promote scraped rows into live businesses; scraped results still land in Pending for review.
