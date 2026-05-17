import { useState } from "react";
import { Pause, Play, Trash2, Search, Download, Bell, BellOff, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { getRecentDebugLogs, getSupportBundleData } from "@/lib/admin.functions";
import { useDebugDrawer } from "./debug-drawer-provider";
import {
  exportCsv,
  exportJson,
  exportSupportBundle,
  type SupportBundleMeta,
} from "./export";
import type { DebugLog, FilterType } from "./types";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scrape", label: "Scrape" },
  { value: "packet", label: "Packet" },
  { value: "auth", label: "Auth" },
  { value: "database", label: "DB" },
  { value: "other", label: "Other" },
];

export function Controls() {
  const {
    filter,
    setFilter,
    search,
    setSearch,
    paused,
    setPaused,
    clear,
    logs,
    filteredLogs,
    muteErrors,
    setMuteErrors,
  } = useDebugDrawer();
  const { user, role } = useAuth();
  const fetch7d = useServerFn(getRecentDebugLogs);
  const fetchBundle = useServerFn(getSupportBundleData);
  const [busy, setBusy] = useState<string | null>(null);

  const meta = (): SupportBundleMeta => ({
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    role,
    app_version: "hearth-handbook",
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    viewport:
      typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
    url: typeof window !== "undefined" ? window.location.href : "",
    active_filter: filter,
    search_query: search,
  });

  const handleExport7d = async () => {
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

  const handleSupportBundle = async () => {
    setBusy("bundle");
    try {
      const res = await fetchBundle({ data: { days: 7 } });
      exportSupportBundle(res.logs as DebugLog[], meta(), {
        event_summary: res.event_summary,
        table_counts: res.table_counts,
        since: res.since,
      });
      toast.success("Support bundle ready");
    } catch (err) {
      toast.error("Bundle failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              filter === f.value
                ? "bg-amber-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1 pl-7 pr-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          title={paused ? "Resume live updates" : "Pause live updates"}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
            paused
              ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
              : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-amber-500/40"
          }`}
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? "Paused" : "Live"}
        </button>
        <button
          type="button"
          onClick={() => setMuteErrors(!muteErrors)}
          title={muteErrors ? "Unmute error toasts" : "Mute error toasts"}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
            muteErrors
              ? "border-zinc-700 bg-zinc-900 text-zinc-500"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          {muteErrors ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:border-amber-500/40"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Export
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dark border-zinc-800 bg-zinc-950 text-zinc-100">
            <DropdownMenuItem onClick={() => exportCsv(filteredLogs)}>
              Filtered ({filteredLogs.length}) — CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportJson(filteredLogs)}>
              Filtered ({filteredLogs.length}) — JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={handleExport7d}>
              Last 7 days (server) — JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSupportBundle}>
              Support bundle — JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={clear}
          title="Clear log buffer"
          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:border-rose-500/40 hover:text-rose-300"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="text-[10px] text-zinc-500">
        {logs.length} entries{paused ? " · buffer paused" : ""}
        {muteErrors ? " · errors muted" : ""}
      </div>
    </div>
  );
}
