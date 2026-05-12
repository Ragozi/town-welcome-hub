## Goal

Fix broken QR/PDF links by routing every absolute URL through a configurable `PUBLIC_BASE_URL`, and elevate the buyer landing + realtor packet view to a premium, on-brand feel.

## 1. Configurable public base URL

Add a single resolver used by every link/QR/PDF generator.

**New file: `src/lib/public-url.ts`**
- `export function getPublicBaseUrl(request?: Request): string`
- Resolution order:
  1. `process.env.PUBLIC_BASE_URL` (server) / `import.meta.env.VITE_PUBLIC_BASE_URL` (client) — trimmed of trailing `/`
  2. If `request` provided: `new URL(request.url).origin`
  3. If browser: `window.location.origin`
  4. Fallback: current preview URL string
- `export function packetUrl(slug, opts?: { source?: string })` returns `${base}/p/${slug}` with optional `?s=qr` etc.

**Add secret:** prompt user to add `PUBLIC_BASE_URL` runtime secret (defaults to preview URL). Also document `VITE_PUBLIC_BASE_URL` for client builds when domain is attached. (Will use `secrets--add_secret` during implementation.)

## 2. Use it everywhere

- `src/routes/api/packet-pdf.$slug.tsx`: replace `new URL(request.url).origin` with `getPublicBaseUrl(request)`. QR code + cover footer + thank-you all use this.
- `src/routes/_authenticated/packets.$id.tsx`: derive `liveUrl` from `getPublicBaseUrl()` (client). Remove the `useState(origin)` dance. PDF download href stays relative (`/api/packet-pdf/...`) since it's same-origin from the realtor app, but show a separate "Public PDF link" using base URL for sharing.
- `src/routes/p.$slug.tsx`: referral link + share buttons use `packetUrl`/base.

## 3. Realtor packet view (`/packets/$id`)

- Replace mounted-origin pattern with `getPublicBaseUrl()` so QR renders on first paint (no flash).
- Side panel becomes a stacked card:
  - **QR card**: white rounded-3xl, larger 240px QR, copy-link + download-QR-PNG buttons (use `qrcode.react` ref → canvas).
  - **PDF card**: dark card, "Preview" opens PDF inline in new tab, "Download" forces `?download=1` (handled in PDF route via `Content-Disposition: attachment`).
  - **Share card**: copy link, mailto, sms.
- Add a small inline preview thumbnail (`<iframe src={pdfUrl} />` at 320×420, lazy) so realtors see the PDF without leaving the page.

## 4. Buyer landing (`/p/$slug`) premium polish

Keep all existing tracking. Visual changes only:

- **Softer palette**: shift hero overlay to warm cream gradient (`from-[--wi-cream] via-background/0`), reduce dark vignette intensity. Add fine grain texture (existing `--shadow-soft`).
- **Realtor branding band — promoted to just under hero**, full-width on a tinted card:
  - Larger headshot (96px), brokerage logo beside name, name in display font, contact chips with hover lift.
  - "Your guide" eyebrow, soft divider.
- **Welcome note** moved into its own quote-style block (serif accent, generous padding).
- **Featured / Locals we love**: keep 3-up grid but add gentle hover scale, softer shadow, sponsor badge refined.
- **Directory**: category headers get a hairline divider + count chip; cards get more whitespace, consistent radius (rounded-2xl), category icon (lucide) optional.
- **Thank-you footer**: replace harsh `bg-foreground` with a warm gradient (`from-[--wi-pine] to-foreground`), heart icon animates on mount.
- Generous `py-20` section spacing on md+; max-w-6xl for directory.
- Add `aria-live` toast-free confirmation: tiny "Saved your visit ♥" pill bottom-right that fades after landing_view fires (subtle, dismissible).

No new dependencies required.

## 5. PDF download mode

Update `/api/packet-pdf/$slug` to read `?download=1` query and switch `Content-Disposition` between `inline` (default, for preview iframe) and `attachment`.

## Test plan

1. Set `PUBLIC_BASE_URL` to current preview origin.
2. Open existing test packet `/packets/{id}` → QR renders immediately, PDF preview iframe loads, download button forces save.
3. Scan QR with phone → lands on `/p/$slug?s=qr` → `landing_view` + `qr_scanned` events written.
4. Open generated PDF → cover QR + footer URL match `PUBLIC_BASE_URL`.
5. Change `PUBLIC_BASE_URL` to a fake domain → regenerate PDF → links update; UI still works because client falls back to `window.location.origin` when env unset.

## Files touched

- new: `src/lib/public-url.ts`
- edit: `src/routes/api/packet-pdf.$slug.tsx`
- edit: `src/routes/_authenticated/packets.$id.tsx`
- edit: `src/routes/p.$slug.tsx`
- secret: add `PUBLIC_BASE_URL`

## Out of scope

- Custom domain attachment (separate flow)
- Email-to-buyer delivery
- Stats wiring beyond what's already logged
