
# TownWelcome — MVP Plan

A mobile-first directory site that auto-routes visitors to their local Wisconsin town page (starting with Ozaukee County), shows sponsored + categorized businesses, and lets anyone download a one-page PDF with a QR code back to the live page.

Stack: TanStack Start (React 19 + Vite) + Tailwind + shadcn/ui + Lovable Cloud (Supabase under the hood) + server functions for PDF generation. Admin panel and Firecrawl scraping deferred to a follow-up.

---

## 1. Database (Lovable Cloud)

Tables created via migration:

- **towns** — `id, slug, name, county, state, zip_codes (text[]), latitude, longitude, hero_blurb, created_at`
- **categories** — `id, slug, name, icon (lucide name), display_order`
- **businesses** — `id, town_id (fk), category_id (fk), name, subcategory, address, phone, website, description, logo_url, coupon_text, coupon_expires (date), sponsor_tier (enum: none|bronze|silver|gold|s_tier), featured_order (int), scraped_from, last_scraped, created_at`
- **sponsor_tiers** — `id, key, name, price_monthly, display_priority` (reference table for future billing)

RLS: public `select` on all four tables. No public writes (admin/scraping comes later behind auth).

Seed data: ~5 Ozaukee towns (Grafton, Cedarburg, Mequon, Port Washington, Thiensville) with lat/lng + zip arrays, ~8 categories (Restaurants, Coffee & Breakfast, Shopping, Services, Health, Parks & Rec, Schools, City Services), and ~6–10 sample businesses per town including 1–2 sponsored ones with coupons so the prototype looks real.

## 2. Routes

```
src/routes/
  __root.tsx              shell + QueryClient
  index.tsx               landing + geolocation CTA + manual fallback
  $townSlug.tsx           dynamic town page (/grafton, /cedarburg, …)
  api/pdf.$townSlug.ts    server route returning a PDF stream
```

No `/admin` in this MVP.

## 3. Home page (`/`)

- Hero: "Welcome to your town" + big primary "Use my location" button.
- On click → `navigator.geolocation.getCurrentPosition` → server function `resolveTownFromCoords({ lat, lng })` that:
  1. Finds nearest town in our `towns` table within ~25km using lat/lng (haversine in SQL).
  2. Falls back to Nominatim reverse geocode → match returned postcode against `zip_codes`.
  3. Returns `{ slug }` or `null`.
- On success → `navigate({ to: '/$townSlug', params: { townSlug: slug } })`.
- Fallback UI (denied / no match / error): manual town `<Select>` + ZIP input.
- Loading and error states for each branch; never a blank screen.

## 4. Town page (`/$townSlug`)

Loader calls a server function `getTownPage(slug)` returning `{ town, categoriesWithBusinesses }`.

Layout:
- Sticky header: town name, "Download PDF" button, small QR (links to current URL).
- Hero banner with `town.hero_blurb`.
- **Featured / Sponsored** section at top — sorted by `sponsor_tier` priority (s_tier > gold > silver > bronze) then `featured_order`. Larger cards with logo, coupon badge, "Featured" pill.
- **Category sections** below as tab strip on mobile, anchored sections on desktop. Each business card: logo, name, short description, phone (tel:), website (new tab), coupon if present, address with map link (`https://maps.google.com/?q=…`).
- Footer: "Not the right town?" → back to `/`.
- Empty state per category when no businesses.
- 404 (`notFoundComponent`) when slug doesn't exist.

## 5. PDF + QR

Server route `GET /api/pdf/$townSlug`:
- Fetches the same data as the town page.
- Generates QR code as a data URL with `qrcode` pointing to `https://{host}/{slug}`.
- Renders a one-page A4 PDF with `@react-pdf/renderer` (`renderToStream`): town header + QR top-right, sponsored block, then categorized business list in a compact two-column layout. Print-friendly typography, no images required beyond logos (lazy — fall back to initials if missing).
- Returns the stream with `Content-Type: application/pdf` and `Content-Disposition: inline; filename="townwelcome-{slug}.pdf"`.

The header "Download PDF" button is a plain `<a href="/api/pdf/{slug}" target="_blank">`.

## 6. Design system

Friendly community feel: soft greens + blues on warm off-white. Define tokens in `src/styles.css` (oklch) — `--primary` (sage green), `--accent` (lake blue), `--card`, gradient + shadow tokens for sponsored cards. Use shadcn `Button`, `Card`, `Badge`, `Tabs`, `Select`, `Input`, `Skeleton`, `Sonner` for toasts. Mobile-first; large tap targets.

## 7. Out of scope for this build (next iteration)

- `/admin` route + Lovable Cloud auth + business CRUD + tier editor.
- Firecrawl edge function to scrape "best pizza in Grafton WI" → upsert into `businesses`.
- Stripe/Paddle for sponsor billing.
- Milwaukee County expansion (just add rows to `towns` later — schema already supports it).

---

## Technical details

- **Geolocation flow timing**: The "<3s" target is met by trying nearest-neighbor lat/lng first (single SQL query) and only hitting Nominatim if no match within radius.
- **Server functions**: `resolveTownFromCoords`, `getTownPage`, `listTowns` in `src/lib/towns.functions.ts`. Public reads use the browser Supabase client through the auth-middleware-less path (anon key, RLS public-read).
- **PDF**: `@react-pdf/renderer` works in Worker SSR runtime; QR generated server-side as PNG data URL via `qrcode`. Both packages added with `bun add`.
- **Routing**: town page uses `$townSlug` param; `notFoundComponent` for unknown slugs. No layout wrappers under `_app/` (TanStack convention).
- **SEO per route**: each town page sets `head()` with `title: "Welcome to {Town}, WI — TownWelcome"`, description, og tags. Index sets generic landing meta.
- **Nominatim usage**: free tier, called from server function with a descriptive `User-Agent`; cached briefly per coord to be polite.
