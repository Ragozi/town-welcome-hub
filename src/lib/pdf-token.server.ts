import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

function hmac(payload: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signPdfToken(slug: string, ttlSeconds: number = TOKEN_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${exp}.${hmac(`${slug}.${exp}`)}`;
}

export function verifyPdfToken(slug: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(`${slug}.${exp}`);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
