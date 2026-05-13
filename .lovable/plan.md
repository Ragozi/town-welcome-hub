## Goal

Reposition Hearth Handbook as a B2B product for realtors. Stop giving the local guide away for free. The only way a buyer sees town content is by scanning the QR code on a packet their realtor made (`/p/{slug}`).

## 1. New landing page (`src/routes/index.tsx`)

Full rewrite. Realtor-first, buyer-secondary. No geolocation, no ZIP search, no town picker.

Sections:
1. **Hero** — "Give every buyer a handcrafted welcome to their new town." Subhead about closing-gift packets + QR code. Primary CTA "Start free" → `/login`. Secondary "See a sample packet" → links to a demo `/p/{slug}` (we'll hardcode one existing slug, or fall back to `/login` if none).
2. **What it is** — 3-up: (1) Pick a town, (2) Personalize the packet (buyer name, kids/pets, interests), (3) Print the QR card / share the link. Lifted visual style from current Showcase grid.
3. **Sample preview** — single screenshot/illustration of a packet page with the QR.
4. **For buyers (small)** — one short band: "Got a QR code from your realtor? Scan it — your handbook is waiting." No link to browse anything.
5. **Sponsor band** — keep the existing `#sponsor` "Get listed" CTA (local businesses are still a revenue lever).
6. Footer unchanged.

Remove: `useMyLocation`, `findByZip`, town `Select`, `listTowns`/`resolveTown` imports, `MapPin`/`Search`/`Loader2` imports that become unused.

## 2. Remove public town surface

- **Delete** `src/routes/$townSlug.tsx` (publicly browsable town directory). The packet page `/p/$slug` already renders the same town content scoped to a realtor's buyer — that's the only place it should live.
- **Delete** `src/routes/towns.tsx` (public towns directory).
- **Delete** `src/routes/api/pdf.$townSlug.tsx` (public per-town PDF — bypasses gating). Realtors still get packet PDFs via `src/routes/api/packet-pdf.$slug.tsx`.
- **Update `src/components/site-header.tsx`**: remove "Towns" link. Nav becomes Home / About / Sponsor / Realtor Login. "Get Listed" CTA stays.
- **Update `src/components/site-footer.tsx`**: remove any `/towns` or town-slug links.
- **Update `src/routes/sitemap[.]xml.ts`**: stop emitting `/towns` and per-town URLs. Keep `/`, `/about`, `/login`, `/privacy`, `/terms`, and per-packet `/p/{slug}` entries (packets are realtor-shared, OK to leave indexable as today — flag in note below).
- **Update `public/robots.txt`** and `public/llms.txt` if they reference `/towns` or town slugs.
- **Update `src/routes/about.tsx`** copy if it links to `/towns` or describes browsing towns directly.

## 3. Leave alone (already gated correctly)

- `/p/$slug` packet page — this is the buyer entry point. Unchanged.
- `/_authenticated/*` realtor app, `/admin/*`, `/login`, `/me/*`.
- DB tables — no schema change. `towns`, `categories`, `businesses` still feed packet pages server-side; they're just no longer exposed via a public route.
- `src/lib/towns.ts` helpers — still used by packet rendering and the realtor packet builder. Only the unused exports (`resolveTown`, the public-listing pieces) can be trimmed in a later pass; safer to leave for this turn.

## 4. Open question to flag (not blocking)

Packet URLs (`/p/{slug}`) are currently in the sitemap and publicly readable. That's intentional today (a realtor shares the link with one buyer), but if you want stricter gating later we can: (a) drop them from the sitemap, (b) add `noindex` on the packet route, or (c) require a short token in the URL. Calling it out — not changing in this pass unless you say so.

## Technical notes

- TanStack file-based routing: deleting a route file removes the route; `routeTree.gen.ts` regenerates automatically.
- All `<Link to="/$townSlug" ...>` and `<Link to="/towns">` references must be removed in the same pass or the typed router will fail the build. I'll grep for both before finishing.
- No DB migration. No new dependencies.
