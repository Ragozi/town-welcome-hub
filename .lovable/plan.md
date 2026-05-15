# Handbook QA + Data Pipeline + Entity Library

Three connected pieces, sequenced so each unblocks the next.

---

## 1. Connect Firecrawl

Add Firecrawl as the scrape source for local business data.

- Add Firecrawl connector via `standard_connectors--connect` (`firecrawl`)
- Server-only client in `src/lib/firecrawl.server.ts` reading `FIRECRAWL_API_KEY` from `process.env`

---

## 2. Scraped entities library (per-town)

A new admin surface where each town has its own library of scraped businesses. Admins decide which ones flow into handbooks.

### Schema

New table `scraped_businesses`:
- `town_id` (FK → towns)
- `category_id` (FK → categories, nullable until classified)
- `source` (`firecrawl_search` | `firecrawl_map` | `manual`)
- `source_url`, `source_query`
- `name`, `address`, `phone`, `website`, `description`, `logo_url`
- `raw` (jsonb — full Firecrawl payload)
- `status` enum: `pending` | `included` | `excluded` | `promoted`
- `excluded_reason` (text, nullable)
- `promoted_business_id` (FK → businesses, nullable — set when "Promote to sponsor")
- `last_scraped_at`, timestamps
- Unique on (`town_id`, `website`) to dedupe re-scrapes

RLS: admin-only read/write.

### Server functions (`src/lib/scraped.functions.ts`)

- `scrapeTown({ townId, categorySlugs?, limit? })` — admin-only. Runs Firecrawl `search` per category for the town's name + state, upserts results as `pending`.
- `listScrapedForTown({ townId, status? })`
- `setScrapedStatus({ id, status, reason? })` — include / exclude / pending
- `promoteToBusiness({ id, sponsor_tier })` — copies into `businesses` table and marks `promoted`

### UI: `/admin/towns/$slug/library`

- Header: town name + "Scrape now" button (categories multiselect, limit slider)
- Tabs: **Pending** · **Included** · **Excluded** · **Promoted (Sponsors)**
- Table per row: logo, name, category, website, source, last scraped
- Per-row actions: Include · Exclude (with reason) · Promote to sponsor (opens tier picker)
- Bulk: select rows → Include / Exclude
- Counts per tab in chip badges

Link from `/admin` → "Town Libraries" → list of towns → `/admin/towns/$slug/library`.

---

## 3. Data parse preview (in New Handbook flow)

Before generating the PDF, show what will appear so the realtor can adjust.

After the existing New Handbook form, insert a **Preview** step:

- Detected town (with override dropdown)
- For each category: list of businesses that will appear, ordered by sponsor tier then alpha
  - Source badge (Sponsor / Included from library / Auto)
  - Eyeball toggle to exclude-for-this-handbook-only (stored on packet as `excluded_business_ids[]`)
- Missing-data warnings (no businesses for category X, ambiguous town match, etc.)
- "Looks good → Generate handbook" button

Schema add: `packets.excluded_business_ids uuid[] default '{}'`.

The town/category business query gets a filter: `status = 'included' OR status = 'promoted'` from the library, plus any direct sponsors, minus the per-packet exclusions.

---

## 4. QA handbook

A first end-to-end test packet so we can iterate on layout/content.

- Admin button on `/admin` → "Generate QA handbook"
- Creates a packet with fixed slug `qa-sample`, seeded buyer data ("Sample Buyer", a real address in a town that has library data), runs the same render path as a real packet
- Re-running overwrites the existing `qa-sample`
- Visible at `/p/qa-sample` and downloadable as PDF
- Admin page shows: last generated timestamp, link to view, link to PDF, "Regenerate" button

This is the surface we'll use to review and iterate on visual/content changes.

---

## Build order

1. Migration: `scraped_businesses` table + `packets.excluded_business_ids`
2. Firecrawl connector + server client
3. Scrape + library admin UI (one town first to validate)
4. Parse-preview step in New Handbook
5. QA handbook generator + admin entry point

## Files

- new: `supabase/migrations/<ts>_scraped_businesses.sql`
- new: `src/lib/firecrawl.server.ts`, `src/lib/scraped.functions.ts`
- new: `src/routes/_authenticated/admin.towns.index.tsx`, `src/routes/_authenticated/admin.towns.$slug.library.tsx`
- new: `src/routes/_authenticated/admin.qa.tsx` (or button on admin index)
- edit: `src/routes/_authenticated/packets.new.tsx` (add Preview step)
- edit: `src/routes/_authenticated/admin.tsx` / `admin.index.tsx` (nav entries)
- edit: `src/lib/packets.ts` or related render path (apply library + per-packet exclusions)
