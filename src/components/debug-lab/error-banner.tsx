import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useDebugDrawer } from "./debug-drawer-provider";

export function ErrorBanner() {
  const { recentErrors, openAndSelect } = useDebugDrawer();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || recentErrors.length === 0) return null;
  return (
    <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
          <AlertTriangle className="h-3 w-3" />
          {recentErrors.length} recent error{recentErrors.length === 1 ? "" : "s"}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-rose-300/70 hover:text-rose-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <ul className="space-y-1">
        {recentErrors.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => openAndSelect(e.id)}
              className="block w-full truncate rounded px-1.5 py-1 text-left font-mono text-[10px] text-rose-100 hover:bg-rose-500/20"
              title={e.message}
            >
              <span className="text-rose-400">{e.function_name}</span> · {e.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
