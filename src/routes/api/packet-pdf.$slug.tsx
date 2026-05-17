import { createFileRoute } from "@tanstack/react-router";

// The server-side PDF route is retired: @react-pdf/renderer depends on the
// Yoga WASM module, which Cloudflare Workers do not allow to compile at
// runtime. PDF rendering now happens in the browser on /packets/$id. This
// stub responds 410 Gone so any cached email/QR links fail cleanly instead
// of throwing 500s.
export const Route = createFileRoute("/api/packet-pdf/$slug")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          "PDF generation moved client-side. Open the packet in your dashboard to download.",
          { status: 410, headers: { "Content-Type": "text/plain" } },
        );
      },
    },
  },
});
