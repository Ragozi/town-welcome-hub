## Why the PDF route is returning 500

Server logs from the last hour show every `/api/packet-pdf/...` request failing with:

```
RuntimeError: Aborted(CompileError: WebAssembly.instantiate():
Wasm code generation disallowed by embedder)
```

`@react-pdf/renderer` depends on Yoga (a flexbox layout engine) compiled to WASM. It instantiates that WASM from a raw buffer at render time. Cloudflare Workers — the runtime serving our TanStack server routes — disallow dynamic WASM compilation. This is a hard runtime constraint, not a flag we can toggle.

Engine comparison (in the project's actual runtime context):

| Engine | Runs on our Worker? | React-style authoring? | Notes |
|---|---|---|---|
| @react-pdf/renderer (current, server) | ❌ WASM blocked | ✅ | Works in the browser, not the Worker |
| Playwright / Puppeteer | ❌ needs Chromium binary | n/a (HTML) | Requires external service ($/latency) |
| Hosted HTML→PDF (PDFShift, Browserless, DocRaptor) | ✅ via fetch | n/a | Per-render cost + PII leaves perimeter |
| pdf-lib / pdfkit | ✅ pure JS | ❌ low-level drawing | Full rewrite of layout |
| jsPDF (browser) | ✅ in browser | ❌ low-level | n/a |

User direction: stay on react-pdf. The only viable way to do that without a rewrite is to **render in the browser**, where react-pdf's WASM works fine.

## Plan

Keep the exact `<Document>` JSX, fonts, layout, and QR pipeline we already built — just move execution to the client. The server's job shrinks to providing sanitized data; the browser does the layout and produces the file.

### 1. New client-side renderer module

Create `src/lib/pdf/handbook-document.tsx`:
- Extract the `PacketPdf`, `FeaturedCardPdf`, `CategoryPdf` components and `styles` from `src/routes/api/packet-pdf.$slug.tsx` verbatim into this client-safe file. Import from `@react-pdf/renderer` (the package auto-resolves to its browser entry when imported from a client module).

### 2. Server function for the data payload

Create `src/lib/handbook.functions.ts` with `getHandbookData({ slug })`:
- Auth: realtor must own the packet (reuse `requireSupabaseAuth` + ownership check, same pattern as `issuePdfToken`).
- Returns a plain DTO: packet fields needed for the PDF, realtor profile (full name, brokerage, email_public, phone, headshot_url), town, categories, businesses (post-exclusion).
- No WASM, no streaming, no Worker constraint hit.

QR data URL is generated **in the browser** using the existing `qrcode` package (already in deps; works client-side). No server work needed for the QR.

### 3. Replace the iframe preview + download buttons in `src/routes/_authenticated/packets.$id.tsx`

- Remove the broken iframe pointing at `/api/packet-pdf/...`.
- Use `useQuery` to fetch `getHandbookData({ slug })`.
- Render `<PDFViewer>` from `@react-pdf/renderer` for the inline preview (same look as the iframe, but client-rendered).
- "Download" button uses `<PDFDownloadLink document={<PacketPdf .../>} fileName="...">` — produces a real PDF blob in the browser.
- "Open" button uses `pdf(<PacketPdf .../>).toBlob()` then `URL.createObjectURL` + `window.open`.
- Loading state while react-pdf is mounted (it's lazy by nature — wrap in Suspense or use the `loading` prop of `PDFDownloadLink`).

### 4. Retire the broken server route

`src/routes/api/packet-pdf.$slug.tsx`:
- Option A (chosen): delete the route entirely. Nothing else references it once `packets.$id.tsx` is migrated. Public buyer page `/p/$slug` does not link to the PDF.
- Option B (deferred): keep as a stub that returns `410 Gone` with a message, so any cached email/QR links don't silently 500. We'll do this — one-line handler, no behavior change for active users.

Token machinery (`pdf-token.server.ts`, `issuePdfToken`) becomes unused — remove the export from `public-packet.functions.ts` and delete `pdf-token.server.ts`. The PII protection that token provided is now enforced by `getHandbookData` requiring auth + ownership.

### 5. QA checklist after the swap

- Realtor logs in → opens `/packets/$id` → sees inline PDF preview rendering (cover, directory page, thank-you page).
- Cover QR scans to the live `/p/$slug?s=qr`.
- "Download" button writes a real `.pdf` to disk.
- Unauthenticated user navigating directly to `/packets/$id` is redirected to `/login` (already enforced by `_authenticated` layout).
- Buyer landing page `/p/$slug` still loads (it doesn't depend on the PDF route).
- `bunx tsc --noEmit` clean.

## Technical notes

- `@react-pdf/renderer` already in `package.json`; bundle hit on the client is ~250 KB gzipped — acceptable for an authenticated, low-traffic dashboard route. Code-split by importing it dynamically inside the route component (`const { PDFViewer, PDFDownloadLink, pdf } = await import("@react-pdf/renderer")` inside an effect, or `React.lazy`).
- `qrcode` (already used server-side) works identically in the browser — same `QRCode.toDataURL(url)` call.
- No new packages, no external services, no new secrets.
- The PDF event tracking (`pdf_downloaded` counter, `packet_events` insert) that the old server route did needs to move into a small `logEvent` server fn call from the download click handler. Will add a one-line tracking call.

## Tradeoffs vs. alternatives

- We lose server-side PDF generation, so we can't email a PDF attachment from the server later without revisiting. If that becomes a requirement, the right move is a hosted HTML→PDF service called via fetch (Worker-safe) — separate decision.
- Visual fidelity, fonts, layout: identical to today, because we're reusing the same `<Document>` tree.
