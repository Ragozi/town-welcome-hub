import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { useDebugDrawer } from "@/components/debug-lab/debug-drawer-provider";

export const Route = createFileRoute("/_authenticated/admin/debug")({
  component: DebugLabPage,
});

function DebugLabPage() {
  const { setOpen, logs } = useDebugDrawer();
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
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-amber-200 transition-all hover:-translate-y-0.5 hover:bg-amber-500/20"
          >
            <Wrench className="h-4 w-4" />
            Open Drawer
          </button>
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
