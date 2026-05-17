import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

function Node({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isObj = value !== null && typeof value === "object";
  const isArr = Array.isArray(value);

  if (!isObj) {
    let cls = "text-emerald-300";
    if (typeof value === "number") cls = "text-amber-300";
    else if (typeof value === "boolean") cls = "text-fuchsia-300";
    else if (value === null) cls = "text-zinc-500";
    const display =
      typeof value === "string"
        ? `"${value}"`
        : value === null
          ? "null"
          : String(value);
    return (
      <div className="font-mono text-xs leading-relaxed">
        {name !== undefined && <span className="text-sky-300">{name}</span>}
        {name !== undefined && <span className="text-zinc-500">: </span>}
        <span className={cls}>{display}</span>
      </div>
    );
  }

  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className="font-mono text-xs leading-relaxed">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {name !== undefined && <span className="text-sky-300">{name}</span>}
        {name !== undefined && <span className="text-zinc-500">: </span>}
        <span className="text-zinc-500">
          {isArr ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {open && (
        <div className="ml-4 border-l border-zinc-800 pl-2">
          {entries.map(([k, v]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function JsonInspector({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };
  return (
    <div className="relative h-full overflow-auto rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-300 hover:border-amber-500/60 hover:text-amber-300"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy JSON"}
      </button>
      <Node value={data} depth={0} />
    </div>
  );
}
