import { Wrench } from "lucide-react";
import { useDebugDrawer } from "./debug-drawer-provider";

export function DebugFab() {
  const { enabled, open, setOpen, unread } = useDebugDrawer();
  if (!enabled || open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      title="Open Debug Lab"
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950 text-amber-300 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.6)] transition-all hover:scale-105 hover:border-amber-400 hover:text-amber-200"
    >
      <Wrench className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
