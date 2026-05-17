# Debug Lab — Implementation Plan

A persistent right-side drawer in the admin area showing real-time backend activity, backed by a new `debug_logs` table + Supabase Realtime, with a clickable JSON inspector and filters.

## 1. Database

New migration: `debug_logs` table.

Columns:

- `id uuid pk`
- `created_at timestamptz default now()`
- `event_type text` — `scrape | packet | auth | database | other`
- `function_name text`
- `status text` — `success | running | error`
- `message text`
- `payload jsonb default '{}'`
- `user_id uuid null`
- `duration_ms integer null`

RLS:

- Admins (`has_role(auth.uid(),'super_admin')`) can SELECT.
- INSERT only via service role (server functions); no client policy.
- Add table to `supabase_realtime` publication; `REPLICA IDENTITY FULL`.
- Index on `(created_at desc)`, `(event_type)`, `(status)`.
- Retention helper: keep last 7 days (cleanup function called opportunistically on insert when row count > threshold, or simply rely on manual clear for now).

## 2. Server-side logging helper

`src/lib/debug-log.server.ts`:

- `logDebug({ event_type, function_name, status, message, payload?, user_id? })` — fire-and-forget insert via `supabaseAdmin`. Never throws (swallow + console.error).
- `withDebugLog(meta, fn)` wrapper: emits a `running` entry, then `success`/`error` with `duration_ms` and result/error payload (sanitized, capped at ~4 KB).

Instrument:

- `firecrawlSearch` (src/lib/firecrawl.server.ts) → event_type=`scrape`
- `getHandbookData`, `getPublicPacket`, `issuePdfToken` (already removed) → event_type=`packet`
- `logEvent` (tracking.functions.ts) → event_type=`database`
- Admin functions (invite create/revoke, user role changes) → `auth`
- Generic catch in `src/server.ts` error wrapper → `error`/`other`

All payload writes pass through a `sanitize()` that strips `email`, `phone`, `buyer_last_name`, bearer tokens.

## 3. Admin nav entry

Edit `src/routes/_authenticated/admin.tsx`: add `<Link to="/admin/debug">🔧 Debug Lab</Link>` chip styled with a slate→cyan gradient (matches existing chip pattern).

New route `src/routes/_authenticated/admin.debug.tsx` — minimal page that mainly documents the drawer + offers a "Open Debug Lab" button. The drawer itself is global within the admin layout (see next).

## 4. Drawer UI

New components:

- `src/components/debug-lab/debug-drawer-provider.tsx` — React context: `{ open, setOpen, paused, setPaused, filter, search, selectedId, ... }`. Mounted inside `_authenticated/admin.tsx` so it persists across admin subroutes.
- `src/components/debug-lab/debug-fab.tsx` — fixed bottom-right floating button (🔧) with unread count badge.
- `src/components/debug-lab/debug-drawer.tsx` — Sheet (shadcn) from the right, `w-[380px] sm:w-[420px]`, dark theme scoped via `class="dark"` wrapper + custom tokens (warm amber accents on near-black bg).
- `src/components/debug-lab/log-feed.tsx` — virtualized-ish scroll (simple list, cap at 500 in memory). Each row: timestamp (HH:mm:ss.SSS), colored status dot, function name (mono), short message, event_type chip. Click → set `selectedId`. Auto-scroll to bottom unless user has scrolled up (track with `onScroll`).
- `src/components/debug-lab/json-inspector.tsx` — pretty JSON with collapsible nodes (lightweight custom recursive renderer; no new dep) + "Copy JSON" button using `navigator.clipboard`. Syntax colors via tailwind classes.
- `src/components/debug-lab/controls.tsx` — filter Select (All / Scrape / Packet / Auth / Database / Other), search Input, Pause toggle, Clear button (clears local buffer only; optional admin "wipe table" behind confirm).

Layout inside drawer: top = controls, middle = log feed (flex-1, scroll), bottom (40% height) = JSON inspector when a row is selected, collapsible.

## 5. Realtime + initial fetch

Inside provider:

- On mount (super admin only): `supabase.from('debug_logs').select('*').order('created_at',{ascending:false}).limit(200)` then reverse for display.
- `supabase.channel('debug_logs').on('postgres_changes', { event:'INSERT', schema:'public', table:'debug_logs' }, (p) => appendIfNotPaused(p.new))`.
- Buffer paused inserts into a queue; on resume, flush.
- Filter + search applied client-side over the in-memory buffer.

## 6. Styling

Drawer interior tokens (scoped, don't change global theme):

```
bg: oklch(0.16 0.01 60)   /* warm near-black */
fg: oklch(0.92 0.02 80)
accent: oklch(0.78 0.16 55) /* amber */
success: oklch(0.78 0.16 150)
error: oklch(0.68 0.20 25)
running: oklch(0.80 0.16 75)
```

Mono font: existing `font-mono` token (JetBrains Mono if available, else system mono).

## 7. Files touched / created

Created:

- `supabase/migrations/<ts>_debug_logs.sql`
- `src/lib/debug-log.server.ts`
- `src/routes/_authenticated/admin.debug.tsx`
- `src/components/debug-lab/{debug-drawer-provider,debug-fab,debug-drawer,log-feed,json-inspector,controls}.tsx`

Edited:

- `src/routes/_authenticated/admin.tsx` (mount provider + FAB + nav chip)
- `src/lib/firecrawl.server.ts` (instrument)
- `src/lib/handbook.functions.ts` (instrument)
- `src/lib/public-packet.functions.ts` (instrument `getPublicPacket`)
- `src/lib/tracking.functions.ts` (instrument)
- `src/lib/admin.functions.ts` (instrument key mutations)
- `src/server.ts` (log uncaught SSR errors)

## 8. Out of scope

- No edit/replay of past requests.
- No log export to file (Copy JSON only).
- No per-user log streams — super admin-only view of everything.

## Open question

Realtime cross-tab is via Supabase Realtime as specified. Confirm OK to also persist logs to `debug_logs` (vs in-memory only). Plan assumes **persist + Realtime** since the brief lists the table schema explicitly.