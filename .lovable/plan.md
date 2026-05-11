
# TownWelcome — Design Overhaul + Featured Grouping + Logo Fallbacks

A full visual rebuild inspired by SNAPTURE's warm, editorial aesthetic, plus two structural improvements: featured businesses grouped by category (no auto-care-next-to-bistro), and category-themed image fallbacks for businesses that haven't uploaded a logo yet.

---

## 1. Design system overhaul (`src/styles.css`)

New "Snapture shell + WI accent" palette, defined in oklch tokens:

- `--background` — warm cream (#F9F5F0-ish)
- `--foreground` — deep charcoal (near-black, slightly warm)
- `--primary` — vibrant orange (#FF6B00-ish) for CTAs, pills, links
- `--primary-foreground` — cream
- `--card` — pure cream / off-white
- `--muted` — soft taupe
- `--border` — warm sand
- Keep existing `--wi-lake / --wi-pine / --wi-cheddar / --wi-cranberry / --wi-sunset / --wi-corn / --wi-sky / --wi-barn` tokens — used ONLY on category chips, section badges, and category icon tiles for personality.
- New gradients: `--gradient-warm`, `--gradient-orange-glow`
- New shadows: `--shadow-soft` (cream cards), `--shadow-cta` (orange glow)
- Typography scale: bold uppercase display, clean body. Use `font-display` (e.g. Bricolage Grotesque or Fraunces via Google Fonts `<link>` in `__root.tsx`) for headings; system sans for body. Set tracking-tight + uppercase utilities for hero headlines.
- Dark mode kept consistent (deeper warm-charcoal bg, orange unchanged).

## 2. Shared layout pieces

- **`src/components/site-header.tsx`** — sticky top bar: left "TOWNWELCOME." wordmark; center nav (Home, Towns, Sponsor, About); right black pill "Get Listed" button with small orange dot. Cream bg, dark text. Reused on every route.
- **`src/components/site-footer.tsx`** — dark charcoal footer with cream text, contact + nav columns, "List your business" orange button, social row. Reused.
- **`src/components/section-divider.tsx`** — small uppercase eyebrow + thin rule (matches Snapture's `// PHOTOGRAPHY` markers) — `// RESTAURANTS`, `// FEATURED`, etc.

## 3. Home page (`/` — `src/routes/index.tsx`)

Snapture-style split hero:
- Left: tall hero image (Wisconsin landscape — lake/forest/farm, Unsplash) with small "// WELCOME" eyebrow.
- Right: massive uppercase headline "DISCOVER YOUR TOWN, ONE LOCAL AT A TIME." with small bird/leaf illustration accent (lucide `Bird` tinted in WI cheddar). Subhead. Big orange "Use my location" pill button + secondary "Browse towns" ghost button.
- Below hero: 3 horizontal "category showcase" cards (Snapture-style) — "EAT LOCAL", "SHOP MAIN STREET", "EXPLORE OUTDOORS" with photo + arrow CTA, each linking to a filter on a town page.
- Town picker section (existing `<Select>` + ZIP form) restyled into Snapture cream card with orange accents.
- **Hydration fix**: wrap the ZIP `<form>` so LastPass extension injection on `<input type="text">` doesn't mismatch — use `suppressHydrationWarning` on the form and ensure consistent SSR markup. (Also resolves the current runtime hydration error.)

## 4. Town page (`/$townSlug` — `src/routes/$townSlug.tsx`)

Major restructure:

### Hero
Snapture split hero adapted to a town: photo of the town on the left (Unsplash by town name), big uppercase "WELCOME TO {TOWN}." + hero blurb on the right, orange "Download Welcome PDF" CTA + ghost "Share" button with small QR preview.

### Sticky category nav
Keep current scroll-spy chip bar but restyled: cream bg with subtle blur, chips use WI palette colors (lake, pine, cheddar, etc.) — active chip lifts with orange ring instead of full color flip. Sits below site header.

### Featured — grouped by category (NEW behavior)
A "// FEATURED LOCALS" section at the top. Inside it, render **one mini-row per category that has any sponsored business**, ordered by category display order. Each row:
- Small WI-colored category badge + category name ("FEATURED RESTAURANTS")
- Horizontal scroll of premium sponsor cards (sorted by `sponsor_tier` priority then `featured_order`)
- Each card: large business image (logo or fallback), "FEATURED" pill, name, 1-line description, coupon badge if present, phone + website
This guarantees no auto-care card next to a bistro card.

### Category sections
Then the full categorized list as today, but each section restyled as a Snapture "module": large uppercase section title, WI-color icon tile, business cards in a 2–3 column grid with cream bg, generous whitespace, thin borders, hover lift.

### Business card
- Square image area (logo if present, else fallback — see §5)
- Name (bold uppercase), subcategory (small caps, muted)
- Description (2 lines clamped)
- Coupon as orange pill with expiry
- Phone (tel:) + Website (new tab) + Map link as small icon-buttons row

### Footer block
"Not the right town?" → back to `/`. Then full site footer.

## 5. Logo fallback system

New helper `src/lib/logo.ts`:

```ts
businessImage(business, category) -> string
```

Logic:
1. If `business.logo_url` exists → return it.
2. Otherwise return a stable Unsplash Source URL keyed by `category.slug` — e.g.
   - `restaurants` → `https://source.unsplash.com/600x600/?restaurant,food`
   - `coffee` → `?coffee,cafe`
   - `shopping` → `?boutique,storefront`
   - `services` → `?storefront,smalltown`
   - `health` → `?wellness,clinic`
   - `parks` → `?park,wisconsin`
   - `schools` → `?school,classroom`
   - `city` → `?cityhall,townhall`
   Append `&sig=${business.id}` so each business gets a stable, unique image.
3. As an extra-safe fallback (if image fails to load), client-side `onError` swaps to an initials tile generated from the business name on a WI-palette color picked from `business.id`.

No DB change required — `logo_url` already exists. Admin/scrape work stays deferred.

## 6. PDF redesign (`src/routes/api/pdf.$townSlug.tsx`)

Match new aesthetic in `@react-pdf/renderer`:
- Cream page bg, charcoal text, orange accent rules
- Header: "TOWNWELCOME · {TOWN}, WI" wordmark + QR top-right
- "FEATURED LOCALS" section grouped by category (mirrors web)
- Two-column compact category lists below
- Footer line: "Scan to view live → townwelcome.com/{slug}"

## 7. Out of scope (still deferred)

- Real logo scraping (Firecrawl/OG-image) — flagged for next iteration
- Admin CRUD / business self-serve upload portal
- Stripe billing for sponsor tiers

## Technical notes

- Add Google Fonts link in `__root.tsx` `<head>`: Bricolage Grotesque (700/800) for display, Inter for body.
- Featured grouping is a pure client-side derivation from existing `businesses` query: `groupBy(category_id).filter(g => g.some(b => b.sponsor_tier !== 'none')).sort(category.display_order)`. Inside each group, sort by `tierPriority[sponsor_tier]` desc then `featured_order` asc. No new server function needed.
- Unsplash Source URLs (`source.unsplash.com`) require no API key; cache-friendly. If they ever rate-limit we can swap to a curated `src/assets/category-fallbacks/*.jpg` set without changing call sites.
- Hydration mismatch on `/`: the LastPass injection happens on visible `<input>` siblings of the submit button. Fix by adding `suppressHydrationWarning` on the form wrapper and ensuring no `Date.now()`/random IDs in rendered markup.
- All color usage in components must reference semantic tokens (`bg-background`, `text-primary`, `border-border`) plus the `--wi-*` tokens via small utility classes (e.g. `bg-[hsl(var(--wi-cheddar))]`-style — actually `oklch` via `bg-[var(--wi-cheddar)]`). Document in `src/styles.css` comments.
- Mobile-first: hero stacks, featured rows become horizontal-snap carousels, category nav stays sticky and horizontally scrollable.

## Files touched

- `src/styles.css` — palette + typography + gradients/shadows
- `src/routes/__root.tsx` — Google Fonts, site header/footer wrappers
- `src/routes/index.tsx` — Snapture hero, showcase row, restyled picker, hydration fix
- `src/routes/$townSlug.tsx` — new hero, grouped featured, restyled sections/cards, fallback images
- `src/routes/api/pdf.$townSlug.tsx` — restyled PDF
- `src/components/site-header.tsx` (new)
- `src/components/site-footer.tsx` (new)
- `src/components/section-divider.tsx` (new)
- `src/components/business-card.tsx` (new — extracted, uses fallback)
- `src/lib/logo.ts` (new)

No DB migration. No new packages required.
