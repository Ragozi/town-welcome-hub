import type { DebugLog } from "./types";

function ts(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}`;
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(logs: DebugLog[]): string {
  const header = [
    "created_at",
    "event_type",
    "function_name",
    "status",
    "duration_ms",
    "message",
    "user_id",
    "payload",
  ];
  const rows = logs.map((l) =>
    [
      l.created_at,
      l.event_type,
      l.function_name,
      l.status,
      l.duration_ms ?? "",
      l.message,
      l.user_id ?? "",
      l.payload,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadBlob(name: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(logs: DebugLog[], suffix = "filtered"): void {
  downloadBlob(`hearth-debug-${suffix}-${ts()}.csv`, "text/csv", toCsv(logs));
}

export function exportJson(logs: DebugLog[], suffix = "filtered"): void {
  downloadBlob(
    `hearth-debug-${suffix}-${ts()}.json`,
    "application/json",
    JSON.stringify(logs, null, 2),
  );
}

export type SupportBundleMeta = {
  user_id: string | null;
  user_email: string | null;
  role: string | null;
  app_version: string;
  ua: string;
  viewport: string;
  url: string;
  active_filter: string;
  search_query: string;
};

export function buildSupportBundle(
  logs: DebugLog[],
  meta: SupportBundleMeta,
  extras: Record<string, unknown> = {},
): string {
  return JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      project: "hearth-handbook",
      meta,
      log_count: logs.length,
      logs,
      ...extras,
    },
    null,
    2,
  );
}

export function exportSupportBundle(
  logs: DebugLog[],
  meta: SupportBundleMeta,
  extras: Record<string, unknown> = {},
): void {
  downloadBlob(
    `hearth-support-${ts()}.json`,
    "application/json",
    buildSupportBundle(logs, meta, extras),
  );
}
