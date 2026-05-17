## Fix: Gap Analysis detail panel overflow + use right-side space

**Problem:** On `/admin/debug`, clicking a row in the Gap Analysis table renders a detail card *underneath* the table inside a fixed 500px box with no clipping, so it visually spills onto the "What's instrumented" section below. The embedded panel also only uses a narrow column even though there's plenty of horizontal room on the page.

### Changes

**1. Split-pane layout for `GapAnalysisPanel`** (`src/components/debug-lab/gap-analysis.tsx`)

Restructure the panel into a responsive two-column layout:

```text
┌──────────────────────────────┬───────────────────────┐
│ Town picker + summary stats  │                       │
├──────────────────────────────┤   Detail card         │
│                              │   (selected row)      │
│   Scrollable table           │                       │
│                              │   – Found examples    │
│                              │   – Why skipped       │
│                              │   – Suggested action  │
│                              │   – Re-scrape button  │
└──────────────────────────────┴───────────────────────┘
```

- Wrap table area and detail card in a `flex` row: table gets `flex-1 min-w-0`, detail gets a fixed `w-[340px] shrink-0` sidebar.
- Detail sidebar is `overflow-y-auto` so long excluded-reasons lists scroll inside their own column.
- When nothing is selected, sidebar shows a muted "Select a row to inspect" placeholder (keeps layout stable, no jump when clicking).
- Below `md` breakpoint (drawer use-case at 420px), collapse back to stacked layout (`flex-col md:flex-row`) so the existing drawer view still works.

**2. Container fix on the admin page** (`src/routes/_authenticated/admin.debug.tsx`, line 281)

- Add `overflow-hidden` to the embed wrapper so nothing can spill regardless of content.
- Bump height from `h-[500px]` to `h-[560px]` (or `min-h-[500px]`) to give the new two-column layout breathing room.
- Widen the section — currently the parent `.space-y-6` column on `/admin/debug` already runs full width, so the panel will naturally fill horizontally once the inner layout is row-based.

### Out of scope
- No changes to data fetching, server functions, RLS, or scrape behavior.
- Drawer (`debug-drawer.tsx`) stays unchanged — the responsive `flex-col` fallback handles the narrow drawer case automatically.
- No changes to row click behavior or re-scrape button logic.
