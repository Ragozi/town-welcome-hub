// Resolve the public-facing base URL used in QR codes, PDFs, and shareable links.
// Priority:
//   1. Server: process.env.PUBLIC_BASE_URL
//   2. Client: import.meta.env.VITE_PUBLIC_BASE_URL
//   3. Request origin (if provided, server-side)
//   4. window.location.origin (browser)
//   5. Empty string (caller decides)

function trim(u: string | undefined | null): string {
  if (!u) return "";
  return u.replace(/\/+$/, "");
}

export function getPublicBaseUrl(request?: Request): string {
  if (typeof process !== "undefined" && process.env?.PUBLIC_BASE_URL) {
    return trim(process.env.PUBLIC_BASE_URL);
  }
  try {
    // @ts-ignore — import.meta.env exists in Vite contexts
    const v = import.meta.env?.VITE_PUBLIC_BASE_URL as string | undefined;
    if (v) return trim(v);
  } catch {
    /* noop */
  }
  if (request) {
    try {
      return trim(new URL(request.url).origin);
    } catch {
      /* noop */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return trim(window.location.origin);
  }
  return "";
}

export function packetUrl(slug: string, opts?: { source?: string; request?: Request }): string {
  const base = getPublicBaseUrl(opts?.request);
  const path = `/p/${slug}`;
  const query = opts?.source ? `?s=${encodeURIComponent(opts.source)}` : "";
  return `${base}${path}${query}`;
}

export function packetPdfUrl(slug: string, opts?: { download?: boolean; request?: Request }): string {
  const base = getPublicBaseUrl(opts?.request);
  const query = opts?.download ? "?download=1" : "";
  return `${base}/api/packet-pdf/${slug}${query}`;
}
