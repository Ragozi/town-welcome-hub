import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listScrapeFilterRules,
  createScrapeFilterRule,
  updateScrapeFilterRule,
  deleteScrapeFilterRule,
  bulkSetEnabled,
  testScrapeFilter,
} from "@/lib/scrape-filter-rules.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2, Pencil, FlaskConical, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/scrape-rules")({
  component: ScrapeRulesPage,
});

const RULE_TYPES = ["domain_contains", "url_regex", "title_regex", "url_suffix"] as const;
type RuleType = (typeof RULE_TYPES)[number];

const RULE_TYPE_HELP: Record<RuleType, string> = {
  domain_contains: "Substring match against URL hostname (www stripped, lowercased)",
  url_regex: "Case-insensitive regex against the full URL",
  title_regex: "Case-insensitive regex against the search result title",
  url_suffix: "Exact suffix match against URL (e.g. .pdf)",
};

type Rule = {
  id: string;
  rule_type: RuleType;
  pattern: string;
  reason_label: string;
  enabled: boolean;
  notes: string | null;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
};

function fmtRel(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function ScrapeRulesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listScrapeFilterRules);
  const rulesQ = useQuery({
    queryKey: ["scrape-filter-rules"],
    queryFn: () => listFn(),
  });

  const [typeFilter, setTypeFilter] = useState<"all" | RuleType>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const filtered = useMemo(() => {
    const rows = rulesQ.data ?? [];
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.rule_type !== typeFilter) return false;
      if (!s) return true;
      return (
        r.pattern.toLowerCase().includes(s) ||
        r.reason_label.toLowerCase().includes(s) ||
        (r.notes ?? "").toLowerCase().includes(s)
      );
    });
  }, [rulesQ.data, typeFilter, search]);

  const stats = useMemo(() => {
    const rows = rulesQ.data ?? [];
    const enabled = rows.filter((r) => r.enabled).length;
    const totalHits = rows.reduce((a, r) => a + r.hit_count, 0);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const top24h = [...rows]
      .filter((r) => r.last_hit_at && new Date(r.last_hit_at).getTime() >= cutoff)
      .sort((a, b) => b.hit_count - a.hit_count)
      .slice(0, 3);
    return { enabled, totalHits, top24h, total: rows.length };
  }, [rulesQ.data]);

  const updateFn = useServerFn(updateScrapeFilterRule);
  const toggleEnabledMut = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scrape-filter-rules"] }),
    onError: (e) => toast.error("Toggle failed", { description: (e as Error).message }),
  });

  const deleteFn = useServerFn(deleteScrapeFilterRule);
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrape-filter-rules"] });
      toast.success("Rule deleted");
    },
    onError: (e) => toast.error("Delete failed", { description: (e as Error).message }),
  });

  const bulkFn = useServerFn(bulkSetEnabled);
  const bulkMut = useMutation({
    mutationFn: (enabled: boolean) =>
      bulkFn({ data: { ids: Array.from(selected), enabled } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["scrape-filter-rules"] });
      setSelected(new Set());
      toast.success(`Updated ${r.count} rules`);
    },
    onError: (e) => toast.error("Bulk update failed", { description: (e as Error).message }),
  });

  function scrollToRule(id: string) {
    setHighlightId(id);
    setTimeout(() => {
      rowRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setHighlightId(null), 2500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          Scrape Rules
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin-editable filters applied to scrape results to exclude junk domains,
          aggregators, PDFs, and listicles.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Enabled rules" value={`${stats.enabled} / ${stats.total}`} />
        <StatCard label="Total hits" value={stats.totalHits.toLocaleString()} />
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Top hits (24h)
          </div>
          {stats.top24h.length === 0 ? (
            <div className="mt-2 text-sm text-muted-foreground">No hits in last 24h</div>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {stats.top24h.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <button
                    onClick={() => scrollToRule(r.id)}
                    className="truncate text-left hover:underline"
                    title={r.pattern}
                  >
                    {r.reason_label}
                  </button>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.hit_count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <TestCard onScrollToRule={scrollToRule} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search pattern, label, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {RULE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <>
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMut.mutate(true)}
              disabled={bulkMut.isPending}
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMut.mutate(false)}
              disabled={bulkMut.isPending}
            >
              Disable
            </Button>
          </>
        )}
        <div className="ml-auto">
          <Button onClick={() => setCreating(true)} className="rounded-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add rule
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-10 p-2">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                  onCheckedChange={(c) => {
                    const next = new Set(selected);
                    if (c) filtered.forEach((r) => next.add(r.id));
                    else filtered.forEach((r) => next.delete(r.id));
                    setSelected(next);
                  }}
                />
              </th>
              <th className="w-16 p-2 text-left">On</th>
              <th className="w-36 p-2 text-left">Type</th>
              <th className="p-2 text-left">Pattern</th>
              <th className="p-2 text-left">Reason</th>
              <th className="w-20 p-2 text-right">Hits</th>
              <th className="w-28 p-2 text-left">Last hit</th>
              <th className="w-24 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rulesQ.isLoading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
                </td>
              </tr>
            )}
            {!rulesQ.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No rules match.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(r.id, el);
                  else rowRefs.current.delete(r.id);
                }}
                className={`border-t border-border transition-colors ${
                  highlightId === r.id ? "bg-amber-100/60 dark:bg-amber-900/30" : ""
                }`}
              >
                <td className="p-2 align-middle">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(c) => {
                      const next = new Set(selected);
                      if (c) next.add(r.id);
                      else next.delete(r.id);
                      setSelected(next);
                    }}
                  />
                </td>
                <td className="p-2 align-middle">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) =>
                      toggleEnabledMut.mutate({ id: r.id, enabled: v })
                    }
                  />
                </td>
                <td className="p-2 align-middle">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
                    {r.rule_type}
                  </span>
                </td>
                <td className="p-2 align-middle">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.pattern}</code>
                </td>
                <td className="p-2 align-middle">{r.reason_label}</td>
                <td className="p-2 text-right align-middle font-mono">{r.hit_count}</td>
                <td className="p-2 align-middle text-xs text-muted-foreground">
                  {fmtRel(r.last_hit_at)}
                </td>
                <td className="p-2 text-right align-middle">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete rule "${r.reason_label}"?`)) deleteMut.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RuleDialog
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        onSaved={() => qc.invalidateQueries({ queryKey: ["scrape-filter-rules"] })}
      />
      <RuleDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        rule={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["scrape-filter-rules"] });
          setEditing(null);
        }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function TestCard({ onScrollToRule }: { onScrollToRule: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<
    | { passed: true }
    | { passed: false; matchedRule: { id: string; reason_label: string; pattern: string; rule_type: string } }
    | null
  >(null);

  const testFn = useServerFn(testScrapeFilter);
  const mut = useMutation({
    mutationFn: () => testFn({ data: { url, title: title || undefined } }),
    onSuccess: (r) => {
      setResult(r as never);
      if (!r.passed && r.matchedRule) onScrollToRule(r.matchedRule.id);
    },
    onError: (e) => toast.error("Test failed", { description: (e as Error).message }),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <FlaskConical className="h-4 w-4" /> Test a URL against current rules
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          placeholder="https://example.com/page"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          placeholder="Result title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          onClick={() => mut.mutate()}
          disabled={!url || mut.isPending}
          className="rounded-full"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
        </Button>
      </div>
      {result && (
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
            result.passed
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          {result.passed ? (
            <>
              <Check className="h-4 w-4" /> Would PASS
            </>
          ) : (
            <>
              <X className="h-4 w-4" /> Would EXCLUDE: {result.matchedRule.reason_label}
              <code className="ml-2 rounded bg-background/40 px-1.5 py-0.5 text-xs">
                {result.matchedRule.rule_type}: {result.matchedRule.pattern}
              </code>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  mode,
  rule,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  rule?: Rule | null;
  onSaved: () => void;
}) {
  const [ruleType, setRuleType] = useState<RuleType>("domain_contains");
  const [pattern, setPattern] = useState("");
  const [reasonLabel, setReasonLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && rule) {
        setRuleType(rule.rule_type);
        setPattern(rule.pattern);
        setReasonLabel(rule.reason_label);
        setNotes(rule.notes ?? "");
        setEnabled(rule.enabled);
      } else {
        setRuleType("domain_contains");
        setPattern("");
        setReasonLabel("");
        setNotes("");
        setEnabled(true);
      }
    }
  }, [open, mode, rule]);

  const regexError = useMemo(() => {
    if ((ruleType === "url_regex" || ruleType === "title_regex") && pattern) {
      try {
        new RegExp(pattern);
      } catch (e) {
        return (e as Error).message;
      }
    }
    return null;
  }, [ruleType, pattern]);

  const createFn = useServerFn(createScrapeFilterRule);
  const updateFn = useServerFn(updateScrapeFilterRule);
  const mut = useMutation({
    mutationFn: async () => {
      if (mode === "edit" && rule) {
        return updateFn({
          data: {
            id: rule.id,
            rule_type: ruleType,
            pattern,
            reason_label: reasonLabel,
            notes: notes || null,
            enabled,
          },
        });
      }
      return createFn({
        data: {
          rule_type: ruleType,
          pattern,
          reason_label: reasonLabel,
          notes: notes || null,
          enabled,
        },
      });
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Rule updated" : "Rule created");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error("Save failed", { description: (e as Error).message }),
  });

  const valid = !!pattern.trim() && !!reasonLabel.trim() && !regexError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit rule" : "Add rule"}</DialogTitle>
          <DialogDescription>
            Rules are matched in hit-count order; first match excludes the result.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rule type
            </label>
            <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">{RULE_TYPE_HELP[ruleType]}</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pattern
            </label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={ruleType === "url_suffix" ? ".pdf" : "yelp"}
              className={regexError ? "border-rose-500" : ""}
            />
            {regexError && <p className="mt-1 text-xs text-rose-600">{regexError}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reason label
            </label>
            <Input
              value={reasonLabel}
              onChange={(e) => setReasonLabel(e.target.value)}
              placeholder="aggregator: foo"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes (optional)
            </label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm">Enabled</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {mode === "edit" ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
