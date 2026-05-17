import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { DebugLog, FilterType } from "./types";

const MAX_LOGS = 500;

type Ctx = {
  enabled: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
  filter: FilterType;
  setFilter: (v: FilterType) => void;
  search: string;
  setSearch: (v: string) => void;
  logs: DebugLog[];
  filteredLogs: DebugLog[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selected: DebugLog | null;
  unread: number;
  clear: () => void;
};

const DebugCtx = createContext<Ctx | null>(null);

export function DebugDrawerProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const pausedRef = useRef(paused);
  const queueRef = useRef<DebugLog[]>([]);
  const openRef = useRef(open);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(0);
  }, [open]);

  const enabled = isAdmin;

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("debug_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      setLogs((data ?? []).slice().reverse() as DebugLog[]);
    })();

    const channel = supabase
      .channel("debug_logs_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "debug_logs" },
        (payload) => {
          const row = payload.new as DebugLog;
          if (pausedRef.current) {
            queueRef.current.push(row);
            return;
          }
          setLogs((prev) => {
            const next = [...prev, row];
            return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
          });
          if (!openRef.current) setUnread((n) => n + 1);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  // When unpausing, flush queue
  useEffect(() => {
    if (!paused && queueRef.current.length > 0) {
      const queued = queueRef.current;
      queueRef.current = [];
      setLogs((prev) => {
        const next = [...prev, ...queued];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });
    }
  }, [paused]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (filter !== "all" && l.event_type !== filter) return false;
      if (!q) return true;
      return (
        l.function_name.toLowerCase().includes(q) ||
        l.message.toLowerCase().includes(q) ||
        l.event_type.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q)
      );
    });
  }, [logs, filter, search]);

  const selected = useMemo(
    () => logs.find((l) => l.id === selectedId) ?? null,
    [logs, selectedId],
  );

  const clear = useCallback(() => {
    setLogs([]);
    setSelectedId(null);
    queueRef.current = [];
  }, []);

  const value: Ctx = {
    enabled,
    open,
    setOpen,
    paused,
    setPaused,
    filter,
    setFilter,
    search,
    setSearch,
    logs,
    filteredLogs,
    selectedId,
    setSelectedId,
    selected,
    unread,
    clear,
  };

  return <DebugCtx.Provider value={value}>{children}</DebugCtx.Provider>;
}

export function useDebugDrawer(): Ctx {
  const ctx = useContext(DebugCtx);
  if (!ctx) throw new Error("useDebugDrawer must be used inside DebugDrawerProvider");
  return ctx;
}
