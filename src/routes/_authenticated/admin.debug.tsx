import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  FileJson,
  Loader2,
  Wrench,
  XCircle,
} from "lucide-react";
import { useDebugDrawer } from "@/components/debug-lab/debug-drawer-provider";
import { GapAnalysisPanel } from "@/components/debug-lab/gap-analysis";
import {
  exportCsv,
  exportJson,
  exportSupportBundle,
  type SupportBundleMeta,
} from "@/components/debug-lab/export";
import type { DebugLog } from "@/components/debug-lab/types";
import { useAuth } from "@/lib/auth";
import { getRecentDebugLogs, getSupportBundleData } from "@/lib/admin.functions";
import { firecrawlHealthCheck } from "@/lib/scraped.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/debug")({
  component: DebugLabPage,
});

function DebugLabPage() {
  const { setOpen, setTab, logs, filteredLogs } = useDebugDrawer();
  const { user, role } = useAuth();
  const fetch7d = useServerFn(getRecentDebugLogs);
  const fetchBundle = useServerFn(getSupportBundleData);
  const [busy, setBusy] = useState<string | null>(null);

  const healthFn = useServerFn(firecrawlHealthCheck);
  const healthMut = useMutation({
    mutationFn: () => healthFn({}),
  });
  const health = healthMut.data;

  const meta = (): SupportBundleMeta => ({
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    role,
    app_version: "hearth-handbook",
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    viewport:
      typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
    url: typeof window !== "undefined" ? window.location.href : "",
    active_filter: "all",
    search_query: "",
  });

  const handleBundle = async () => {
    setBusy("bundle");
    try {
      const res = await fetchBundle({ data: { days: 7 } });
      exportSupportBundle(res.logs as DebugLog[], meta(), {
        event_summary: res.event_summary,
        table_counts: res.table_counts,
        since: res.since,
      });
      toast.success("Support bundle downloaded");
    } catch (err) {
      toast.error("Bundle failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  const handle7d = async () => {
    setBusy("7d");
    try {
      const res = await fetch7d({ data: { days: 7 } });
      exportJson(res.logs as DebugLog[], "7d");
      toast.success(`Exported ${res.logs.length} log entries`);
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/30 p-8 text-zinc-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-400/80">
              // Debug Lab
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-amber-200">
              Backend Telemetry Console
            </h2>
            <p className="mt-3 max-w-xl text-sm text-zinc-400">
              Live feed of every scrape, packet build, public lookup, tracking write, and admin
              action. Click any entry to inspect its full payload as syntax-highlighted JSON.
              Stream stays connected across the admin section via the floating wrench in the
              bottom right.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-amber-200 transition-all hover:-translate-y-0.5 hover:bg-amber-500/20"
            >
              <Wrench className="h-4 w-4" />
              Open Drawer
            </button>
            <button
              type="button"
              onClick={handleBundle}
              disabled={busy === "bundle"}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-zinc-200 transition-all hover:border-amber-400/60 disabled:opacity-50"
            >
              {busy === "bundle" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              Support bundle
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Buffered", value: logs.length },
            { label: "Success", value: logs.filter((l) => l.status === "success").length },
            { label: "Running", value: logs.filter((l) => l.status === "running").length },
            { label: "Errors", value: logs.filter((l) => l.status === "error").length },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {s.label}
              </div>
              <div className="font-mono text-2xl font-bold text-amber-200">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">
            Quick exports
          </h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => exportCsv(filteredLogs)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-bold uppercase tracking-wider hover:border-primary/60"
            >
              <Download className="h-3.5 w-3.5" />
              Buffered CSV
            </button>
            <button
              type="button"
              onClick={() => exportJson(filteredLogs)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-bold uppercase tracking-wider hover:border-primary/60"
            >
              <Download className="h-3.5 w-3.5" />
              Buffered JSON
            </button>
            <button
              type="button"
              onClick={handle7d}
              disabled={busy === "7d"}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-bold uppercase tracking-wider hover:border-primary/60 disabled:opacity-50"
            >
              {busy === "7d" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Last 7 days
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Exports include sanitized payloads (PII redacted server-side). The support bundle
          includes the last 7 days of logs plus event summary counts and table row counts —
          shaped for pasting into a support ticket.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold uppercase tracking-tight">
              Firecrawl health check
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fires one 1-result search to verify <code className="font-mono text-xs">FIRECRAWL_API_KEY</code> is wired and the service is reachable. Also writes a <code className="font-mono text-xs">scrape</code> event to the log feed above.
            </p>
          </div>
          <Button
            onClick={() => healthMut.mutate()}
            disabled={healthMut.isPending}
            variant="outline"
            className="rounded-full"
          >
            {healthMut.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Checking
              </>
            ) : (
              "Run check"
            )}
          </Button>
        </div>
        {health && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              health.ok
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/5 text-rose-200"
            }`}
          >
            {health.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1 font-mono text-xs">
              <div className="font-bold">
                {health.ok ? "OK" : health.hasKey ? "FAILED" : "MISSING_KEY"}
              </div>
              {"durationMs" in health && health.durationMs != null && (
                <div className="opacity-80">{health.durationMs}ms</div>
              )}
              {health.ok && "sampleUrl" in health && health.sampleUrl && (
                <div className="mt-1 truncate opacity-80">sample: {health.sampleUrl}</div>
              )}
              {!health.ok && "message" in health && health.message && (
                <div className="mt-1 break-words opacity-80">{health.message}</div>
              )}
            </div>
          </div>
        )}
        {healthMut.isError && !health && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3 font-mono text-xs text-rose-200">
            {(healthMut.error as Error).message}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold uppercase tracking-tight">
              Scrape gap analysis
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Per-town coverage of core business types. Find out why pizza shops or pharmacies
              are missing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTab("gap");
              setOpen(true);
            }}
            className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            Open in drawer →
          </button>
        </div>
        <div className="dark mt-4 h-[560px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-100">
          <GapAnalysisPanel />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-6">
        <h3 className="font-display text-lg font-bold uppercase tracking-tight">
          What's instrumented
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Scrape</strong> — Firecrawl search jobs for
            town library discovery
          </li>
          <li>
            <strong className="text-foreground">Packet</strong> — handbook data fetch
            (authenticated) and public packet lookup
          </li>
          <li>
            <strong className="text-foreground">Database</strong> — buyer landing tracking
            events (views, QR scans, clicks, PDF downloads)
          </li>
          <li>
            <strong className="text-foreground">Auth / Other</strong> — reserved for admin
            mutations and uncaught server errors
          </li>
        </ul>
      </div>
    </div>
  );
}
