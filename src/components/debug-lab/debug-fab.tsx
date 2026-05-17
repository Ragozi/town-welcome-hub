import { Wrench } from "lucide-react";
import { useDebugDrawer } from "./debug-drawer-provider";

export function DebugFab() {
  const { enabled, open, setOpen, unread, errorUnread } = useDebugDrawer();
  if (!enabled || open) return null;
  const hasErrors = errorUnread > 0;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      title={hasErrors ? `${errorUnread} new error(s) — Open Debug Lab` : "Open Debug Lab"}
      className={`fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border bg-zinc-950 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.6)] transition-all hover:scale-105 ${
        hasErrors
          ? "border-rose-500 text-rose-300 animate-pulse hover:border-rose-400"
          : "border-amber-500/40 text-amber-300 hover:border-amber-400 hover:text-amber-200"
      }`}
    >
      <Wrench className="h-5 w-5" />
      {hasErrors ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {errorUnread > 99 ? "99+" : errorUnread}
        </span>
      ) : unread > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-zinc-950">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}
