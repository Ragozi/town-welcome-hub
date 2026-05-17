import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Wrench } from "lucide-react";
import { useDebugDrawer } from "./debug-drawer-provider";
import { Controls } from "./controls";
import { LogFeed } from "./log-feed";
import { JsonInspector } from "./json-inspector";

export function DebugDrawer() {
  const { open, setOpen, selected, setSelectedId } = useDebugDrawer();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="dark flex w-full flex-col gap-0 border-l border-zinc-800 bg-zinc-950 p-0 text-zinc-100 sm:max-w-[420px]"
      >
        <header className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-400" />
            <div>
              <div className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
                Debug Lab
              </div>
              <div className="text-[10px] text-zinc-500">Real-time backend activity</div>
            </div>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <Controls />
          <LogFeed />
          {selected && (
            <div className="flex min-h-0 flex-col gap-1" style={{ height: "40%" }}>
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Payload · {selected.function_name}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200"
                >
                  close
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <JsonInspector data={selected.payload} />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
