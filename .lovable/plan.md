
# Welcome Home — Tracking, PDF, Admin & KPI Dashboard

Five workstreams. Built in this order so each unlocks the next.

---

## 1. Real PDF Generation

**Endpoint**: `src/routes/api/packet-pdf.$slug.tsx` (server route).

- Generate a branded PDF on-demand using `@react-pdf/renderer` (Worker-compatible, pure JS).
- Pulls packet + realtor profile + town + featured local businesses + sponsors.
- On first generation: upload to `packet-pdfs` storage bucket, save `pdf_url` on the packet, set `status = 'generated'`.
- On subsequent hits: stream the cached file from storage.
- Increments `pdf_download_count` and logs a `packet_event` row (see §2).
- Sections: cover (buyer name + home photo + agent branding), welcome note, town guide, local businesses by category, sponsor highlights, agent contact + referral CTA, QR back to landing page.

**Packet retention**: Packets live forever by default. Add `archived_at` column + a soft "Archive" action so realtors can hide old ones from their dashboard without breaking buyer QR codes (the public `/p/:slug` keeps working unless explicitly disabled).

---

## 2. Tracking Infrastructure (the data layer for KPIs)

New table `packet_events` — every meaningful interaction becomes a row.

```text
packet_events
  id            uuid pk
  packet_id    uuid null   (null = unattached / nobody's packet)
  realtor_id   uuid null
  town_id      uuid null
  event_type   enum: pdf_generated, pdf_downloaded, qr_scanned,
                     landing_view, business_click, referral_click,
                     sponsor_click, share_click
  source       enum: qr, direct, referral, search, unknown
  utm          jsonb   (utm_source/medium/campaign)
  referrer     text
  user_agent   text
  ip_country   text    (from CF-IPCountry header — no PII)
  ip_region    text
  ip_city      text
  device       enum: mobile, tablet, desktop
  session_id   text    (anon cookie, 30-day rolling)
  metadata     jsonb   (e.g. clicked business_id, target url)
  created_at   timestamptz
```

- `qr_scanned` is detected by appending `?s=qr` to the QR URL, then logged once per session.
- `landing_view` fires on every public `/p/:slug` hit; deduped per `session_id` per day.
- All click handlers on the landing page (`business_click`, `referral_click`, `sponsor_click`, `share_click`) post to a `logEvent` server function.
- Geo + device parsed server-side from request headers — no third-party tracker, no cookies beyond anon `session_id`.

**Realtor referral button**: each realtor profile gets a `referral_slug`. Landing page renders an "Work with {Agent}" CTA → `/r/{referral_slug}?from={packet_slug}` which logs `referral_click` then redirects to the realtor's contact form / phone / email.

**RLS**: `packet_events` insertable by anyone (public landing page logs anon), readable only by admins + the owning realtor (their own packets).

---

## 3. Admin KPI Dashboard (`/admin`)

New layout route `_authenticated/admin.tsx` — gated by `isAdmin`. Sub-routes:

### `/admin` — Overview (the screenshot inspo)
Top row of stat cards (with trend % vs. previous period and sparkline):
- Total packets created
- PDFs downloaded
- QR scans
- Landing page views
- Referral clicks (the ROI metric)
- Avg. engagement per packet (events / packet)

Charts:
- **Activity over time** — multi-line: PDF downloads, QR scans, landing views, referral clicks. Hover tooltip with exact counts per day.
- **Funnel** — Packets created → PDFs downloaded → QR scanned → Landing viewed → Referral clicked. Conversion % between each step.
- **Source breakdown donut** — qr / direct / referral / search.
- **Geography** — top cities/regions table + Wisconsin map heatmap of scan locations.
- **Device split** — mobile/tablet/desktop bar.
- **Top businesses clicked** — leaderboard (helps justify sponsor pricing).
- **Top realtors** — by packets, by referral clicks (ROI leaderboard).
- **Top towns** — packets generated + landing views.

Controls: date range picker (7d / 30d / 90d / custom), compare-to-previous-period toggle, town filter, realtor filter. Every chart point has a hover tooltip; cards show ▲/▼ vs prior period.

### `/admin/packets` — All packets across all realtors (search, filter, open).
### `/admin/realtors` — list, search, **provision new user** (email + role), reset password, assign roles (admin / realtor), deactivate. This replaces the manual script.
### `/admin/businesses` — CRUD businesses + sponsors + tiers (currently DB-only).
### `/admin/towns` — edit town hero blurbs, ZIPs.
### `/admin/events` — raw event log with filters (debug + audit).

---

## 4. Realtor Stats (per-realtor, on their dashboard)

Add a "Stats" tab to the existing realtor dashboard:
- Their own KPI cards (packets, PDF downloads, QR scans, landing views, referral clicks).
- Per-packet drill-down: open any packet → see its event timeline + counts (how many times this buyer's QR was scanned, when, from where, what they clicked).
- Helps the realtor have a real conversation: "Your buyer scanned the welcome packet 12 times and clicked the local hardware store."

---

## 5. Tech Notes

- **PDF lib**: `@react-pdf/renderer` — pure JS, runs fine in the Worker runtime; lets us reuse React for layout.
- **Charts**: `recharts` (already in shadcn ecosystem). Tooltips, comparisons, hover all native.
- **Geo**: read `cf-ipcountry`, `cf-region`, `cf-ipcity` headers in the event-logging server function — no external geo API.
- **Aggregation**: a SQL view `packet_event_daily` (event_type, day, count, realtor_id, town_id) for fast dashboard queries; KPI server functions read from it with date filters.
- **Hover/compare UX**: every card uses a shared `<KpiCard value, delta, sparkline />` component; charts share a `<CompareTooltip />`.

---

## Build Order

1. `packet_events` table + RLS + `logEvent` server fn + session cookie.
2. Wire tracking into `/p/:slug` (landing view, clicks, QR detection, referral redirect route).
3. Real PDF endpoint + cache + download tracking.
4. Realtor stats tab + per-packet timeline.
5. Admin layout + user provisioning page (unblocks self-service).
6. Admin KPI overview + charts + filters + compare mode.
7. Admin packets / businesses / towns / events sub-pages.

Ready to build when you approve.
