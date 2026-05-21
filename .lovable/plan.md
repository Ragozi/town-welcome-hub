
## Goal

Replace the one-click "Download" on the handbook PDF preview with a dialog that lets the user choose between the existing **Full Color PDF** and a new **Print-Friendly PDF** variant. Track which variant was downloaded.

## Changes

### 1. `src/lib/pdf/handbook-document.tsx`
- Add a `variant?: "color" | "print"` prop to `HandbookDocument` (default `"color"`).
- Define a second `StyleSheet` (or merge overrides) for the `"print"` variant:
  - White page background (replace `#F9F2E8` cream).
  - Drop the dark thank-you page background → white with black text.
  - Remove cover photo overlay tint; keep the photo but skip the fade tint.
  - Replace orange accents (`#FF6B00`) with black/dark gray for headings, eyebrows, rules, coupon text.
  - Remove `noteBox` / `realtorCard` / `featuredCard` fill colors → transparent with a 1px gray border.
  - Keep all layout, fonts, sizes, QR, sections identical (same engine, same component tree).
- Implement via a small `getStyles(variant)` helper that returns the merged sheet — no duplication of the JSX tree.

### 2. `src/components/handbook-pdf-panel.tsx`
- Replace the single `<PDFDownloadLink>` button with a **"Download" button** that opens a `Dialog` (`@/components/ui/dialog` — already in project).
- Dialog content: two cards/options
  - **Full Color PDF** — "Branded version with full images, colors, sponsor highlights. Best for digital viewing and premium printing."
  - **Print-Friendly PDF** — "Reduced color, white background, high contrast. Optimized for home printers and lower ink."
- Each option renders its own `<PDFDownloadLink>` (built from `<HandbookDocument variant=... />`) so the file is generated on click with the chosen variant.
- File name suffix: `…-welcome-<slug>.pdf` for color, `…-welcome-<slug>-print.pdf` for print.
- `recordOnce()` becomes `recordOnce(variant)` and passes `variant` through to the server fn.
- Keep the existing `<PDFViewer>` preview as-is (always shows the color version — it's the design preview).

### 3. `src/lib/packet-downloads.functions.ts`
- Extend the input validator to accept `variant: z.enum(["color", "print"]).default("color")`.
- Persist the variant in the `packet_events.metadata` JSON (`{ triggered_by, variant }`) so analytics can split downloads by variant.
- Leave the `packets.pdf_download_count` increment unchanged (both variants count as a download).

### 4. (Optional, only if needed) Migration
- No schema change required. `packet_events.metadata` is already `jsonb`, so the variant flows in without a migration. Skip the migration step.

## Out of scope
- No new analytics dashboard tile for variant split — data is captured in `packet_events.metadata` and can be surfaced later.
- No change to `/api/packet-pdf/$slug` server route (live link still serves the color version).
- No change to `HandbookPdfPanel`'s on-screen preview.

## Files touched
- `src/lib/pdf/handbook-document.tsx` (add variant styling)
- `src/components/handbook-pdf-panel.tsx` (dialog + two download links)
- `src/lib/packet-downloads.functions.ts` (accept + log variant)
