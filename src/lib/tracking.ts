// Browser-safe tracking helpers
const SESSION_KEY = "wh_session";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function detectSource(): "qr" | "direct" | "referral" | "search" | "unknown" {
  if (typeof window === "undefined") return "unknown";
  const url = new URL(window.location.href);
  const s = url.searchParams.get("s");
  if (s === "qr") return "qr";
  if (s === "ref" || url.searchParams.get("ref")) return "referral";
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const r = new URL(ref);
    if (r.hostname === window.location.hostname) return "direct";
    if (/google|bing|duckduckgo|yahoo/.test(r.hostname)) return "search";
    return "referral";
  } catch {
    return "unknown";
  }
}

export function readUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = url.searchParams.get(k);
    if (v) out[k] = v.slice(0, 200);
  }
  return out;
}
