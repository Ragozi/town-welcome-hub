
# Debug Lab v2 — Exports, Alerts & Gap Analysis

All features ship inside the existing `/admin/debug` route + the floating Debug Lab drawer. Every entry point re-checks `has_role(auth.uid(), 'super_admin')` — RLS on `debug_logs` already enforces this server-side.

## 1. Export logs

Add an **Export** menu (shadcn `DropdownMenu`) in `src/components/debug-lab/controls.tsx`:
- **Export filtered (CSV)** — current `filteredLogs` only
- **Export filtered (JSON)** — same, full payloads
- **Export last 7 days (JSON)** — fetches fresh from Supabase (not just the in-memory 500 buffer)
- **Export support bundle (.zip-style JSON)** — single JSON file with: logs, current user, app version, browser UA, timestamp, active filter — shaped for pasting into a support ticket

Implementation:
- New helper `src/components/debug-lab/export.ts` — pure functions: `toCsv(logs)`, `toJson(logs)`, `downloadBlob(name, mime, content)`, `buildSupportBundle(logs, meta)`
- For "last 7 days" fetch: `supabase.from('debug_logs').select('*').gte('created_at', sevenDaysAgo).order('created_at')` — RLS limits to super admins
- Filenames: `hearth-debug-{yyyy-mm-dd-HHmm}.{csv|json}`
- Payloads are already PII-sanitized server-side by `withDebugLog`, so exports are safe to share

## 2. Error alerts

Real-time surfacing of `status === 'error'` rows:

- **Toast on new error** (sonner) — fires from `DebugDrawerProvider` realtime handler when row is an error and drawer is closed. Click toast → opens drawer + selects that log.
- **FAB red pulse + error count badge** — `DebugFab` already shows unread; add a separate red `errorCount` badge that only counts errors since last drawer-open. Animated ring pulse when > 0.
- **In-drawer alert banner** — sticky banner at top of `LogFeed` listing the last 3 errors with "Jump to" buttons; dismissible per session.
- **Quiet hours / mute toggle** — checkbox in controls "Mute error toasts" (persists to `localStorage`). Drawer badge still updates.

Provider changes (`debug-drawer-provider.tsx`): track `errorCount`, expose `muteErrors`/`setMuteErrors`, fire `toast.error(...)` on qualifying inserts.

## 3. Scrape Gap Analysis ("why no pizza shops?")

New tab inside the Debug Lab drawer: **Logs | Gap Analysis**.

Concept: compare expected coverage of "core business types" per town vs. what the scraper actually produced, and explain misses.

### Data model

Add a small reference table — `core_business_categories`:
- `category_slug` (FK to `categories.slug`), `min_expected` (int, default 1), `is_critical` (bool), `synonyms` (text[])

Seeded with the launch-critical list: pizza, coffee, grocery, pharmacy, hardware, restaurant, ice_cream, gym, urgent_care, dentist, hair_salon, auto_repair, daycare, bakery, bank.

### Server function

`getScrapeGapAnalysis(town_slug)` in `src/lib/admin.functions.ts`:
- Joins `towns` × `core_business_categories` × counts from `businesses` and `scraped_businesses` (grouped by `status`)
- For each core category returns:
  - `expected_min`, `published_count`, `pending_count`, `excluded_count`
  - `status`: `ok` | `thin` | `missing` | `all_excluded`
  - `last_scrape_at` (latest `debug_logs.created_at` where `event_type='scrape'` and payload mentions slug + category)
  - `reasons`: aggregated `excluded_reason` values from `scraped_businesses`, plus latest scrape error messages from `debug_logs`
- Wrapped in `withDebugLog` for self-tracing

### UI — `src/components/debug-lab/gap-analysis.tsx`

- Town selector (defaults to admin's `default_town_id`)
- Table: Category | Expected | Found | Pending | Excluded | Status pill | "Why?" button
- "Why?" opens a side panel with: excluded reasons grouped + count, last 5 scrape log entries for that town/category, recommended action ("Re-run scrape with query: `pizza near {town}`", "Review 4 pending entries", "Loosen excluded_reason: 'chain'")
- One-click **Re-run scrape** button that calls existing scrape flow with a targeted query (super-admin only; logs via `withDebugLog`)
- **Export gap report (CSV)** button — same export helpers as §1

## 4. Support logs export

Specialized variant of the export bundle aimed at sharing with the dev team:

- Button on `/admin/debug` page (top right): **Generate support bundle**
- Produces a single `.json` containing:
  - Last 7 days of debug_logs (server-fetched, not buffered)
  - Last 30 days of `packet_events` summary counts (no PII — counts by event_type/day)
  - Active gap analysis for admin's default town
  - Environment metadata: app version, build time, project ref, user id, UA, viewport
  - Schema fingerprint: list of tables + row counts
- Copy-to-clipboard + download
- Wrapped in `withDebugLog` so the bundle generation itself is auditable

## Files

**New**
- `src/components/debug-lab/export.ts` — CSV/JSON/bundle helpers
- `src/components/debug-lab/gap-analysis.tsx` — gap UI + "why" panel
- `src/components/debug-lab/error-banner.tsx` — sticky in-drawer error banner
- `supabase/migrations/<ts>_core_business_categories.sql` — new table + seed + admin-only RLS

**Edited**
- `src/components/debug-lab/debug-drawer-provider.tsx` — error count, toasts, mute, 7d fetch helper
- `src/components/debug-lab/controls.tsx` — Export dropdown, mute toggle
- `src/components/debug-lab/debug-drawer.tsx` — Logs / Gap Analysis tabs
- `src/components/debug-lab/debug-fab.tsx` — error badge + pulse
- `src/lib/admin.functions.ts` — `getScrapeGapAnalysis`, `generateSupportBundle`
- `src/routes/_authenticated/admin.debug.tsx` — Support bundle button + gap entry point

## Out of scope
- Email/Slack alerts (browser toasts only this round)
- Auto re-scrape scheduling (manual button only)
- Editing the core-category list from UI (seed-only; edit via migration)
- Multi-town gap aggregation (per-town view only)
