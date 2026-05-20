## What the black slab is

In `src/lib/pdf/handbook-document.tsx`, the cover page renders a fixed 360pt tall `coverImageWrap` View with `backgroundColor: "#1a1410"` (near-black). It's meant to hold the buyer's home photo (`packet.home_photo_url`) under a dark overlay. When no photo is uploaded — like the "Me & Jones / 123 Jones St" test packet in your screenshot — only the dark background and overlay render, producing a giant featureless black rectangle above the cream content block.

Even with a photo, the overlay (`rgba(26,20,16,0.35)`) plus near-black fallback makes it look heavy and dated.

## Fix

Rework the cover hero so it never produces an ugly black slab and feels on-brand with the cream/orange identity.

1. **No-photo path (the case in your screenshot)** — replace the dark slab entirely. Render a shorter (~200pt) branded hero band using the cream palette:
   - Background: `#F9F2E8` (matches body) with a thin warm divider or a soft orange→cream gradient stripe at the bottom.
   - Centered eyebrow: `// Welcome Home` in orange (`#FF6B00`).
   - Large display: town name + state (e.g. "Mequon, WI") — uppercase, tight tracking, in `#1a1410`.
   - Subtle pattern or 1pt orange rule for visual interest, no flat black.

2. **With-photo path** — keep an image hero but:
   - Drop fallback background to cream (`#F9F2E8`) so a slow/failed image load doesn't show black.
   - Reduce height from 360 → 280pt so it doesn't dominate the page.
   - Lighten the overlay from `rgba(26,20,16,0.35)` → `rgba(26,20,16,0.15)` and add a bottom gradient fade into the cream body for a softer seam.

3. **Cover layout cleanup** — move the `// Welcome Home` eyebrow + buyer name **into** the hero region (overlay text when photo exists, centered when not), so the cover reads as one composition instead of "black box on top of content."

## Out of scope

- No changes to page 2 (directory) or thank-you page styling.
- No changes to how `home_photo_url` is uploaded or stored — purely PDF rendering.
- No font additions (sticks with built-in Helvetica to avoid font-loading regressions).

## Files

- `src/lib/pdf/handbook-document.tsx` — only file touched. Update `styles.coverImageWrap`, `coverImage`, `coverOverlay`, `coverContent`, and the cover `<Page>` JSX to branch on `packet.home_photo_url`.

## Verification

Open the packet PDF for the "Me & Jones" test packet (no photo) and one with a photo. Confirm:
- No-photo cover shows a cream branded hero, no black.
- Photo cover shows the image with a soft overlay and clean fade into the body.
- Page 2 and the thank-you page are unchanged.
