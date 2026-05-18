## Admin-managed scrape filter rules

Build the table + admin UI + test tool exactly per your spec. Will NOT touch `src/lib/scrape-filter.ts`, `src/lib/scraped.functions.ts`, or `src/lib/firecrawl.server.ts` — those stay on the hard-coded list until you wire them up.

### 1. Migration
One additive migration containing exactly:
- `scrape_filter_rule_type` enum (`domain_contains`, `url_regex`, `title_regex`, `url_suffix`)
- `public.scrape_filter_rules` table (columns, indexes, RLS gated on `super_admin`, `touch_updated_at` trigger)
- `public.increment_filter_rule_hits(uuid[])` RPC (`SECURITY DEFINER`, `search_path = public`)
- Seed `INSERT` with all 60 rules from your prompt, copied verbatim

### 2. Server functions — `src/lib/scrape-filter-rules.functions.ts` (new)
Admin-only (`requireSupabaseAuth` + inline `assertAdmin`):
- `listScrapeFilterRules()` — returns all rules, ordered `hit_count desc, created_at desc`
- `createScrapeFilterRule({ rule_type, pattern, reason_label, notes?, enabled? })` — Zod-validated; for `*_regex` types, attempts `new RegExp(pattern)` server-side and rejects on throw
- `updateScrapeFilterRule({ id, ...patch })` — same regex validation
- `deleteScrapeFilterRule({ id })`
- `bulkSetEnabled({ ids, enabled })`
- `testScrapeFilter({ url, title? })` — loads enabled rules, runs the matching logic locally (duplicate of the spec'd semantics; will be replaced by Claude Code's shared helper later), returns `{ passed, matchedRule?: { id, rule_type, pattern, reason_label } }`

Matching semantics (mirrors the current `scrape-filter.ts` behavior so the test card is accurate before Claude Code lands the shared helper):
- `domain_contains` → substring against `new URL(url).hostname.toLowerCase().replace(/^www\./, "")`
- `url_suffix` → `url.toLowerCase().endsWith(pattern.toLowerCase())`
- `url_regex` → `new RegExp(pattern, "i").test(url)`
- `title_regex` → `new RegExp(pattern, "i").test(title ?? "")`
First match wins; iteration order = `hit_count desc, id` so the most-effective rules short-circuit first (matches what the production scraper will do).

### 3. Admin route — `src/routes/_authenticated/admin.scrape-rules.tsx` (new)
Style matches sibling admin pages.

**Stats banner** (top): enabled-rule count, total hits, top-3 rules by `last_hit_at` in last 24h.

**Test URL card**: URL input + optional title + "Test against rules" button → green `✓ Would PASS` or red `✗ Would EXCLUDE: <reason_label>` chip. When a rule matches, scrolls the table to that row and pulses its background ring.

**Rules table**:
- Columns: enabled toggle, rule_type badge, pattern (`<code>` monospace), reason_label, hit_count, last_hit_at (relative), actions (edit / delete)
- Default sort: `hit_count DESC`
- Filter dropdown by `rule_type`
- Search box across pattern/reason_label/notes (client-side)
- Checkbox column + "Disable selected" / "Enable selected" bulk action

**Add / Edit dialog** (shadcn `Dialog`):
- `Select` for `rule_type` with one-line help text per option
- `Input` for pattern, `Input` for reason_label (placeholder `aggregator: foo`), `Textarea` for notes
- For `url_regex` / `title_regex`: live `new RegExp(pattern)` check, inline error before submit is allowed
- Submit button disabled until valid

All mutations use TanStack Query with `invalidateQueries(["scrape-filter-rules"])`.

### 4. Nav link
Add a "Scrape Rules" pill to the nav in `src/routes/_authenticated/admin.tsx`, between Town Libraries and Invitations, matching the existing gradient style (slate/violet gradient to keep it visually distinct from neighbors).

### Files touched
- **New**: `supabase/migrations/<ts>_scrape_filter_rules.sql`
- **New**: `src/lib/scrape-filter-rules.functions.ts`
- **New**: `src/routes/_authenticated/admin.scrape-rules.tsx`
- **Edit**: `src/routes/_authenticated/admin.tsx` (nav link only)

### Done criteria (matches your spec)
- Table + RPC live, seeded with the 60 rules
- `/admin/scrape-rules` supports list / add / edit / delete / enable-disable / bulk-disable
- Test URL card returns the correct verdict against current enabled rules
- Nav link present
- Zero changes to `scrape-filter.ts`, `scraped.functions.ts`, `firecrawl.server.ts`
