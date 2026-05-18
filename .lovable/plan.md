## Marketing Export — `exportMarketingLeads`

A read-only admin server function that returns the curated, on-demand list of business leads from `scraped_businesses` so OpenClaw (or any downstream marketing tool) can consume them without ever hitting Firecrawl again.

### Where it lives
- New export in `src/lib/scraped.functions.ts` (or a sibling `src/lib/marketing-export.functions.ts` if you'd prefer to keep scrape and export concerns separated — I'd lean toward the sibling file for clarity).

### Signature
```ts
exportMarketingLeads({
  data: {
    town_slug?: string;          // optional filter; omit for all towns
    town_id?: string;            // alternative to slug
    state?: string;              // e.g. "WI" — multi-town filter
    county?: string;             // e.g. "Ozaukee"
    category_slug?: string;      // optional
    include_unverified?: boolean; // default false — only "open" + "unknown-but-not-closed" rows
    format?: "json" | "csv";     // default "json"
    limit?: number;              // default 1000, max 5000
  }
})
```

### Filter logic (default behavior)
Returns rows from `scraped_businesses` WHERE:
- `status = 'included'` (you've vetted them) — **never** pending, excluded, or already-promoted
- `verification_status IN ('open', 'unknown')` — exclude `'closed'` and `'possibly_closed'`
- `website IS NOT NULL`
- Joined to `towns` (name, slug, state, county) and `categories` (slug, name)

Setting `include_unverified: false` (default) means we keep `'unknown'` rows since nothing auto-verifies yet — otherwise the export would be empty. When the verification pass lands later, flip the default to `'open'` only.

### Return shape (JSON)
```ts
{
  generated_at: string;
  filters: { ... echo of inputs ... };
  count: number;
  leads: Array<{
    id: string;                  // scraped_businesses.id
    name: string;
    website: string;
    phone: string | null;
    address: string | null;
    description: string | null;
    category: { slug: string; name: string } | null;
    town: { slug: string; name: string; county: string; state: string };
    verification_status: "open" | "unknown" | "possibly_closed" | "closed";
    last_scraped_at: string;
    source_url: string | null;
  }>
}
```

### CSV format
When `format: "csv"`, return `{ csv: string, count, filters }` with columns: `name, website, phone, address, category, town, county, state, verification_status, last_scraped_at, source_url`. CSV-escape quotes/commas/newlines.

### Security
- `.middleware([requireSupabaseAuth])` + inline `assertAdmin(userId)` (matches existing pattern in `scraped.functions.ts`) — only super_admins can pull the export.
- Uses `supabaseAdmin` so RLS doesn't restrict the read, but the admin gate prevents abuse.
- Input validated with Zod (`limit` capped at 5000, `format` enum, slug/state regex).
- Wrap handler in `withDebugLog("exportMarketingLeads", ...)` so each export shows up in the Debug Lab with `{ count, filters }`.

### UI surface (minimal, this turn)
On `/admin/towns/$slug/library`, add a small **"Export for marketing"** button next to "Deep scrape (county)":
- Default click → downloads `<town-slug>-leads-<YYYYMMDD>.csv` for the current town's `included` rows (verified-or-unknown).
- Holding shift / a small dropdown → JSON download (for piping to OpenClaw API directly).
- Toast shows `"Exported N leads"`.

(No new route needed for OpenClaw itself — they can call the server fn via the existing TanStack RPC endpoint once we share the auth path, or we can add an `/api/public/marketing-export` route gated by an API key in a follow-up. Out of scope here.)

### Notes / non-goals for this turn
- No auto-verification pass (Cheel-style closed-business filtering) — that's a separate task. For now `include_unverified: true` is opt-in if you want pre-verification rows.
- No scheduling / cron — purely on-demand, matching your current scrape model.
- No OpenClaw HTTP push — they pull from this endpoint.
- No changes to `scrapeTown` / `scrapeCounty`.

### Files touched
- **New**: `src/lib/marketing-export.functions.ts` (server fn + CSV helper)
- **Edit**: `src/routes/_authenticated/admin.towns.$slug.library.tsx` (Export button + handler)
