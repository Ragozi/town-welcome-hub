import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Search, Sparkles, Loader2 } from "lucide-react";
import { getScrapeGapAnalysis } from "@/lib/admin.functions";
import { scrapeTown } from "@/lib/scraped.functions";
import { supabase } from "@/integrations/supabase/client";
import { downloadBlob } from "./export";

type Town = { id: string; slug: string; name: string; state: string };
type GapRow = Awaited<ReturnType<typeof getScrapeGapAnalysis>>["rows"][number];
type GapData = Awaited<ReturnType<typeof getScrapeGapAnalysis>>;

const STATUS_STYLES: Record<GapRow["status"], string> = {
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  thin: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  missing: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  all_excluded: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
};

const STATUS_LABEL: Record<GapRow["status"], string> = {
  ok: "OK",
  thin: "Thin",
  missing: "Missing",
  all_excluded: "All excluded",
};

export function GapAnalysisPanel() {
  const fetchGap = useServerFn(getScrapeGapAnalysis);
  const runScrape = useServerFn(scrapeTown);

  const [towns, setTowns] = useState<Town[]>([]);
  const [townSlug, setTownSlug] = useState<string>("");
  const [data, setData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GapRow | null>(null);
  const [scrapingSlug, setScrapingSlug] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("towns")
        .select("id, slug, name, state")
        .order("name");
      const t = (rows ?? []) as Town[];
      setTowns(t);
      if (!townSlug && t.length > 0) setTownSlug(t[0].slug);
    })();
  }, [townSlug]);

  const refresh = useMemo(
    () => async (slug: string) => {
      if (!slug) return;
      setLoading(true);
      setSelected(null);
      try {
        const res = await fetchGap({ data: { town_slug: slug } });
        setData(res);
      } catch (err) {
        toast.error("Gap analysis failed", {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    },
    [fetchGap],
  );

  useEffect(() => {
    if (townSlug) void refresh(townSlug);
  }, [townSlug, refresh]);

  const handleRescrape = async (row: GapRow) => {
    if (!data) return;
    setScrapingSlug(row.slug + (row.subcategory ?? ""));
    try {
      const res = await runScrape({
        data: { townId: data.town.id, categorySlugs: [row.slug], limit: 10 },
      });
      toast.success(`Scrape complete — ${res.inserted} new, ${res.skipped} skipped`);
      await refresh(data.town.slug);
    } catch (err) {
      toast.error("Re-scrape failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setScrapingSlug(null);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const header = [
      "category",
      "subcategory",
      "label",
      "status",
      "expected_min",
      "published",
      "pending",
      "excluded",
      "critical",
      "last_scraped_at",
      "top_excluded_reason",
    ];
    const rows = data.rows.map((r) =>
      [
        r.slug,
        r.subcategory ?? "",
        r.label,
        r.status,
        r.expected_min,
        r.published_count,
        r.pending_count,
        r.excluded_count,
        r.is_critical ? "yes" : "no",
        r.last_scraped_at ?? "",
        r.excluded_reasons[0]?.reason ?? "",
      ]
        .map((v) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    downloadBlob(`hearth-gap-${data.town.slug}-${Date.now()}.csv`, "text/csv", csv);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
          <select
            value={townSlug}
            onChange={(e) => setTownSlug(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1 pl-7 pr-2 font-mono text-xs text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          >
            {towns.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}, {t.state}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void refresh(townSlug)}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:border-amber-500/40"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:border-amber-500/40 disabled:opacity-50"
        >
          CSV
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
          <Stat label="Total" value={data.summary.total} tone="default" />
          <Stat label="OK" value={data.summary.ok} tone="ok" />
          <Stat label="Gaps" value={data.summary.thin + data.summary.missing} tone="warn" />
          <Stat label="Critical" value={data.summary.critical_gaps} tone="err" />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 md:min-w-0">
          {loading && !data ? (
            <div className="flex h-full items-center justify-center text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : data ? (
            <table className="w-full font-mono text-[10px]">
              <thead className="sticky top-0 bg-zinc-900/95 text-zinc-500">
                <tr>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-1 py-1 text-right">Pub</th>
                  <th className="px-1 py-1 text-right">Pend</th>
                  <th className="px-1 py-1 text-right">Excl</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-1 py-1" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const key = r.slug + (r.subcategory ?? "");
                  return (
                    <tr
                      key={key}
                      onClick={() => setSelected(r)}
                      className={`cursor-pointer border-t border-zinc-900 hover:bg-zinc-900/60 ${
                        selected && selected.slug + (selected.subcategory ?? "") === key
                          ? "bg-zinc-900"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-1 text-zinc-200">
                        {r.is_critical && (
                          <span className="mr-1 text-rose-400" title="Critical">
                            ●
                          </span>
                        )}
                        {r.label}
                      </td>
                      <td className="px-1 py-1 text-right text-zinc-300">{r.published_count}</td>
                      <td className="px-1 py-1 text-right text-amber-300">{r.pending_count}</td>
                      <td className="px-1 py-1 text-right text-zinc-500">{r.excluded_count}</td>
                      <td className="px-2 py-1">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLES[r.status]}`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-right">
                        <Sparkles className="h-3 w-3 text-zinc-600" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-3 text-[10px] text-zinc-500">Select a town to begin.</div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 md:w-[340px] md:shrink-0">
          {selected && data ? (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-zinc-900 bg-gradient-to-b from-amber-500/10 to-transparent px-3 py-2">
                <div>
                  <div className="font-display text-xs font-bold uppercase tracking-wider text-amber-200">
                    {selected.label}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {selected.slug}
                    {selected.subcategory ? ` · ${selected.subcategory}` : ""} · expects ≥{" "}
                    {selected.expected_min}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200"
                >
                  close
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {selected.published_examples.length > 0 && (
                  <div className="text-[10px] text-zinc-400">
                    <span className="text-zinc-500">Found:</span>{" "}
                    {selected.published_examples.join(", ")}
                  </div>
                )}

                {selected.excluded_reasons.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300">
                      <AlertCircle className="h-3 w-3" /> Why entries were skipped
                    </div>
                    <ul className="space-y-0.5 font-mono text-[10px] text-zinc-300">
                      {selected.excluded_reasons.map((r) => (
                        <li key={r.reason} className="flex justify-between gap-2">
                          <span className="truncate">{r.reason}</span>
                          <span className="shrink-0 text-zinc-500">×{r.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.status !== "ok" && (
                  <div className="rounded bg-amber-500/10 p-2 text-[10px] text-amber-200">
                    <strong>Suggested:</strong>{" "}
                    {selected.status === "missing"
                      ? `No matches. Try re-scraping "${selected.suggested_query}".`
                      : selected.status === "thin"
                        ? `Below expected count (${selected.published_count}/${selected.expected_min}). Re-scrape to widen pool.`
                        : `All ${selected.excluded_count} matches were excluded. Review reasons or loosen filters.`}
                  </div>
                )}

                <div className="text-[10px] text-zinc-500">
                  Last scraped:{" "}
                  {selected.last_scraped_at
                    ? new Date(selected.last_scraped_at).toLocaleString()
                    : "never"}
                </div>
              </div>

              <div className="border-t border-zinc-900 p-2">
                <button
                  type="button"
                  onClick={() => void handleRescrape(selected)}
                  disabled={scrapingSlug !== null}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {scrapingSlug === selected.slug + (selected.subcategory ?? "") ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Re-scrape {selected.slug}
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 p-4 text-center text-[10px] text-zinc-500">
              <Sparkles className="h-4 w-4 text-zinc-700" />
              <div className="font-bold uppercase tracking-wider text-zinc-400">
                Row inspector
              </div>
              <div>Select a category on the left to see why entries were found or skipped.</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "ok" | "warn" | "err";
}) {
  const colors = {
    default: "text-zinc-100",
    ok: "text-emerald-300",
    warn: "text-amber-300",
    err: "text-rose-300",
  }[tone];
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`font-mono text-base font-bold ${colors}`}>{value}</div>
    </div>
  );
}
