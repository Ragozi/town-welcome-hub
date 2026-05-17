import { useEffect, useRef } from "react";
import { useDebugDrawer } from "./debug-drawer-provider";
import type { DebugLog } from "./types";

const STATUS_COLOR: Record<DebugLog["status"], string> = {
  success: "bg-emerald-500",
  running: "bg-amber-400 animate-pulse",
  error: "bg-rose-500",
};

const TYPE_COLOR: Record<DebugLog["event_type"], string> = {
  scrape: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  packet: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  auth: "text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10",
  database: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  other: "text-zinc-300 border-zinc-600/40 bg-zinc-700/20",
};

function fmt(ts: string) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

export function LogFeed() {
  const { filteredLogs, selectedId, setSelectedId } = useDebugDrawer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredLogs.length]);

  if (filteredLogs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-zinc-500">
        Waiting for backend activity…
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/40"
    >
      <ul className="divide-y divide-zinc-900">
        {filteredLogs.map((log) => {
          const active = log.id === selectedId;
          return (
            <li key={log.id}>
              <button
                type="button"
                onClick={() => setSelectedId(active ? null : log.id)}
                className={`flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors hover:bg-zinc-900/60 ${
                  active ? "bg-zinc-900/80 ring-1 ring-amber-500/40" : ""
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_COLOR[log.status]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="font-mono">{fmt(log.created_at)}</span>
                    <span
                      className={`rounded border px-1 py-0.5 text-[9px] uppercase tracking-wider ${TYPE_COLOR[log.event_type]}`}
                    >
                      {log.event_type}
                    </span>
                    {log.duration_ms != null && (
                      <span className="font-mono">{log.duration_ms}ms</span>
                    )}
                  </div>
                  <div className="truncate font-mono text-xs text-zinc-100">
                    {log.function_name}
                  </div>
                  <div className="truncate text-[11px] text-zinc-400">{log.message}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
