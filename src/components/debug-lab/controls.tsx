import { Pause, Play, Trash2, Search } from "lucide-react";
import { useDebugDrawer } from "./debug-drawer-provider";
import type { FilterType } from "./types";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scrape", label: "Scrape" },
  { value: "packet", label: "Packet" },
  { value: "auth", label: "Auth" },
  { value: "database", label: "DB" },
  { value: "other", label: "Other" },
];

export function Controls() {
  const { filter, setFilter, search, setSearch, paused, setPaused, clear, logs } = useDebugDrawer();
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
          onClick={clear}
          title="Clear log buffer"
          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:border-rose-500/40 hover:text-rose-300"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div className="text-[10px] text-zinc-500">
        {logs.length} entries{paused ? " · buffer paused" : ""}
      </div>
    </div>
  );
}
