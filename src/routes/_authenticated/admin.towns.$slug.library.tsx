import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listScrapedForTown,
  scrapeTown,
  scrapeCounty,
  mineListicles,
  setScrapedStatus,
  promoteToBusiness,
} from "@/lib/scraped.functions";
import { exportMarketingLeads } from "@/lib/marketing-export.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Globe,
  RefreshCw,
  Check,
  X,
  Star,
  Building2,
  Download,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/towns/$slug/library")({
  component: TownLibrary,
});

type Tab = "pending" | "included" | "excluded" | "promoted";

function TownLibrary() {
  const { slug } = useParams({ from: "/_authenticated/admin/towns/$slug/library" });
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [scrapeLimit, setScrapeLimit] = useState(8);
  const [promoting, setPromoting] = useState<{ id: string; name: string } | null>(null);
  const [promoteTier, setPromoteTier] = useState<"bronze" | "silver" | "gold" | "s_tier">("bronze");

  const townQ = useQuery({
    queryKey: ["town", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("towns")
        .select("id, name, state, slug")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
  });

  const fetchList = useServerFn(listScrapedForTown);
  const listQ = useQuery({
    queryKey: ["scraped", townQ.data?.id],
    enabled: !!townQ.data?.id,
    queryFn: () => fetchList({ data: { townId: townQ.data!.id } }),
  });

  const scrapeFn = useServerFn(scrapeTown);
  const scrapeMut = useMutation({
    mutationFn: (limit: number) => scrapeFn({ data: { townId: townQ.data!.id, limit } }),
    onSuccess: (r) => {
      toast.success(`Scrape complete: ${r.inserted} new, ${r.skipped} skipped`);
      if (r.errors.length) toast.warning(r.errors.join(" • "));
      setScrapeOpen(false);
      qc.invalidateQueries({ queryKey: ["scraped", townQ.data?.id] });
    },
    onError: (e) => toast.error("Scrape failed", { description: (e as Error).message }),
  });

  const scrapeCountyFn = useServerFn(scrapeCounty);
  const scrapeCountyMut = useMutation({
    mutationFn: () => scrapeCountyFn({ data: { townId: townQ.data!.id, limit: 10 } }),
    onSuccess: (r) => {
      toast.success(
        `County deep scrape: ${r.inserted} new, ${r.skipped} skipped (${r.searches} searches)`,
      );
      if (r.errors.length) toast.warning(r.errors.join(" • "));
      qc.invalidateQueries({ queryKey: ["scraped", townQ.data?.id] });
    },
    onError: (e) =>
      toast.error("County scrape failed", { description: (e as Error).message }),
  });

  const mineFn = useServerFn(mineListicles);
  const mineMut = useMutation({
    mutationFn: () => mineFn({ data: { townId: townQ.data!.id } }),
    onSuccess: (r) => {
      toast.success(
        `Mined ${r.articlesProcessed} articles: ${r.businessesFound} businesses found, ${r.inserted} added, ${r.skipped} skipped`,
      );
      if (r.errors.length) toast.warning(r.errors.slice(0, 3).join(" • "));
      qc.invalidateQueries({ queryKey: ["scraped", townQ.data?.id] });
    },
    onError: (e) =>
      toast.error("Mine listicles failed", { description: (e as Error).message }),
  });

  const exportFn = useServerFn(exportMarketingLeads);
  const exportMut = useMutation({
    mutationFn: (format: "csv" | "json") =>
      exportFn({ data: { town_slug: slug, format, include_unverified: true, limit: 5000 } }),
    onSuccess: (r, format) => {
      const date = new Date().toISOString().slice(0, 10);
      const blob =
        format === "csv"
          ? new Blob([r.csv ?? ""], { type: "text/csv;charset=utf-8" })
          : new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-leads-${date}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${r.count} leads`);
    },
    onError: (e) => toast.error("Export failed", { description: (e as Error).message }),
  });

  const setStatusFn = useServerFn(setScrapedStatus);
  const setStatusMut = useMutation({
    mutationFn: (vars: {
      ids: string[];
      status: "pending" | "included" | "excluded";
      reason?: string;
    }) => setStatusFn({ data: vars }),
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["scraped", townQ.data?.id] });
    },
  });

  const promoteFn = useServerFn(promoteToBusiness);
  const promoteMut = useMutation({
    mutationFn: (vars: { id: string; sponsor_tier: "bronze" | "silver" | "gold" | "s_tier" }) =>
      promoteFn({ data: vars }),
    onSuccess: () => {
      toast.success("Promoted to sponsor");
      setPromoting(null);
      qc.invalidateQueries({ queryKey: ["scraped", townQ.data?.id] });
    },
    onError: (e) => toast.error("Promote failed", { description: (e as Error).message }),
  });

  const rows = listQ.data?.rows ?? [];
  const cats = listQ.data?.categories ?? [];
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const tabRows = rows.filter((r) => r.status === tab);
  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    included: rows.filter((r) => r.status === "included").length,
    excluded: rows.filter((r) => r.status === "excluded").length,
    promoted: rows.filter((r) => r.status === "promoted").length,
  };

  const toggleSel = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };

  if (townQ.isLoading || !townQ.data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/towns"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> All towns
          </Link>
          <h2 className="font-display mt-2 text-2xl font-extrabold uppercase tracking-tight">
            {townQ.data.name} <span className="text-muted-foreground">· library</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scrapeCountyMut.mutate()}
            disabled={scrapeCountyMut.isPending}
            className="rounded-full"
            title="Iterates all core business types (pizza, ortho, urgent care…) at the county level"
          >
            {scrapeCountyMut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="mr-1.5 h-4 w-4" />
            )}
            Deep scrape (county)
          </Button>
          <Button
            variant="outline"
            onClick={() => exportMut.mutate("csv")}
            disabled={exportMut.isPending}
            className="rounded-full"
            title="Download included + verified leads as CSV for marketing (e.g. OpenClaw)"
          >
            {exportMut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Export for marketing
          </Button>
          <Button
            variant="outline"
            onClick={() => mineMut.mutate()}
            disabled={mineMut.isPending}
            className="rounded-full"
            title="Extract individual businesses named inside 'best of' / aggregator articles in the Excluded tab, resolve each to its own website, and add as Pending"
          >
            {mineMut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            Mine listicles
          </Button>
          <Button onClick={() => setScrapeOpen(true)} className="rounded-full">
            <RefreshCw className="mr-1.5 h-4 w-4" /> Scrape now
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2 text-sm">
        {(["pending", "included", "excluded", "promoted"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSelected(new Set());
            }}
            className={`rounded-full px-3 py-1.5 font-semibold uppercase tracking-wider text-xs ${
              tab === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} <span className="ml-1 opacity-70">{counts[t]}</span>
          </button>
        ))}
      </div>

      {selected.size > 0 && tab !== "promoted" && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            {tab !== "included" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusMut.mutate({ ids: [...selected], status: "included" })}
              >
                <Check className="mr-1 h-3 w-3" /> Include
              </Button>
            )}
            {tab !== "excluded" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusMut.mutate({ ids: [...selected], status: "excluded" })}
              >
                <X className="mr-1 h-3 w-3" /> Exclude
              </Button>
            )}
          </div>
        </div>
      )}

      {listQ.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tabRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Nothing here. {tab === "pending" && "Click 'Scrape now' to pull businesses from the web."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {tab !== "promoted" && <th className="w-8 p-3"></th>}
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Website</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tabRows.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-secondary/20">
                  {tab !== "promoted" && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSel(r.id)}
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    {r.description && (
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {r.category_id ? (catById.get(r.category_id)?.name ?? "—") : "—"}
                  </td>
                  <td className="p-3">
                    {r.website && (
                      <a
                        href={r.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" />{" "}
                        {new URL(r.website).hostname.replace(/^www\./, "")}
                      </a>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {tab !== "included" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatusMut.mutate({ ids: [r.id], status: "included" })}
                        >
                          Include
                        </Button>
                      )}
                      {tab !== "excluded" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatusMut.mutate({ ids: [r.id], status: "excluded" })}
                        >
                          Exclude
                        </Button>
                      )}
                      {tab === "included" && (
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setPromoting({ id: r.id, name: r.name });
                            setPromoteTier("bronze");
                          }}
                        >
                          <Star className="mr-1 h-3 w-3" /> Promote
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scrape dialog */}
      <Dialog open={scrapeOpen} onOpenChange={setScrapeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scrape {townQ.data.name}</DialogTitle>
            <DialogDescription>
              Run a Firecrawl search across all categories. Results land in the Pending tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">Results per category</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={scrapeLimit}
              onChange={(e) =>
                setScrapeLimit(Math.max(1, Math.min(20, Number(e.target.value) || 8)))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScrapeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => scrapeMut.mutate(scrapeLimit)} disabled={scrapeMut.isPending}>
              {scrapeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run scrape"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote dialog */}
      <Dialog open={!!promoting} onOpenChange={(o) => !o && setPromoting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to sponsor</DialogTitle>
            <DialogDescription>{promoting?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="mb-1.5 block text-sm font-medium">Sponsor tier</label>
            <Select
              value={promoteTier}
              onValueChange={(v) => setPromoteTier(v as typeof promoteTier)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="s_tier">S-Tier (Platinum)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPromoting(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                promoting && promoteMut.mutate({ id: promoting.id, sponsor_tier: promoteTier })
              }
              disabled={promoteMut.isPending}
            >
              {promoteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Promote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
