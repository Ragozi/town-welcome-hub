## Plan

The issue is likely on the public buyer handbook route (`/p/$slug`), not only the authenticated dashboard PDF preview. The custom URL you tested (`/packets/...`) falls through to the auth-only packet detail behavior and the current preview also appears stuck on the auth gate/loading state.

### What I’ll change

1. **Add the same download-version dialog to the public handbook page**
   - Locate the “Download Handbook” button on the buyer-facing page.
   - Replace its direct PDF link/download action with a small dialog.
   - Show the two options:
     - Full Color PDF
     - Print-Friendly PDF

2. **Keep the existing PDF engine/layouts**
   - Reuse the existing `HandbookDocument` variant support (`color` / `print`).
   - Generate the selected PDF in-browser using the same `@react-pdf/renderer` flow already used by the dashboard preview.
   - Avoid re-enabling the retired server PDF endpoint, since it was intentionally stubbed out for runtime compatibility.

3. **Track analytics by variant**
   - For authenticated dashboard downloads, keep using the existing `recordPdfDownload` server function.
   - For public buyer-page downloads, use the existing public tracking flow (`logEvent`) and include metadata like `{ variant: "color" }` or `{ variant: "print" }` on `pdf_downloaded`.

4. **Fix route confusion if needed**
   - Ensure download UX is available where users actually land from share links: `/p/$slug`.
   - Keep `/packets/$id` as the authenticated dashboard detail page only.

### Verification

- Open the preview buyer page for the packet.
- Click “Download Handbook”.
- Confirm the dialog opens instead of immediate download.
- Click each option and confirm the selected PDF starts downloading.
- Confirm analytics calls include the selected variant.