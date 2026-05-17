// Server-only Debug Lab logger. Fire-and-forget inserts into public.debug_logs.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DebugEventType = "scrape" | "packet" | "auth" | "database" | "other";
export type DebugStatus = "success" | "running" | "error";

type LogInput = {
  event_type: DebugEventType;
  function_name: string;
  status: DebugStatus;
  message?: string;
  payload?: unknown;
  user_id?: string | null;
  duration_ms?: number | null;
};

const SENSITIVE_KEYS = new Set([
  "email",
  "phone",
  "buyer_email",
  "buyer_last_name",
  "password",
  "authorization",
  "token",
  "access_token",
  "refresh_token",
  "service_role_key",
  "api_key",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (value == null) return value;
  if (typeof value === "string") return value.length > 1000 ? value.slice(0, 1000) + "…" : value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = sanitize(v, depth + 1);
    }
  }
  return out;
}

function capPayload(raw: unknown): Record<string, unknown> {
  try {
    const clean = sanitize(raw);
    const json = JSON.stringify(clean);
    if (json.length > 8000) {
      return { _truncated: true, preview: json.slice(0, 8000) };
    }
    return (clean && typeof clean === "object" ? (clean as Record<string, unknown>) : { value: clean });
  } catch {
    return { _unserializable: true };
  }
}

export function logDebug(input: LogInput): void {
  // Fire-and-forget. Never let logging break a request.
  void (async () => {
    try {
      await supabaseAdmin.from("debug_logs").insert({
        event_type: input.event_type,
        function_name: input.function_name,
        status: input.status,
        message: (input.message ?? "").slice(0, 500),
        payload: capPayload(input.payload ?? {}),
        user_id: input.user_id ?? null,
        duration_ms: input.duration_ms ?? null,
      });
    } catch (err) {
      console.error("[debug-log] insert failed", err);
    }
  })();
}

export async function withDebugLog<T>(
  meta: { event_type: DebugEventType; function_name: string; user_id?: string | null; input?: unknown },
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  logDebug({
    event_type: meta.event_type,
    function_name: meta.function_name,
    status: "running",
    message: "started",
    payload: { input: meta.input },
    user_id: meta.user_id ?? null,
  });
  try {
    const result = await fn();
    logDebug({
      event_type: meta.event_type,
      function_name: meta.function_name,
      status: "success",
      message: "ok",
      payload: { input: meta.input, result },
      user_id: meta.user_id ?? null,
      duration_ms: Date.now() - started,
    });
    return result;
  } catch (err) {
    const status = err instanceof Response ? err.status : undefined;
    const message =
      err instanceof Error ? err.message : err instanceof Response ? `HTTP ${err.status}` : String(err);
    logDebug({
      event_type: meta.event_type,
      function_name: meta.function_name,
      status: "error",
      message,
      payload: { input: meta.input, error: message, http_status: status },
      user_id: meta.user_id ?? null,
      duration_ms: Date.now() - started,
    });
    throw err;
  }
}
