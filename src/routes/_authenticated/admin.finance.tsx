import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  listSponsorSubs, createSponsorSub, updateSponsorSub, deleteSponsorSub,
  listExpenses, createExpense, deleteExpense,
} from "@/lib/finance.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, TrendingUp, TrendingDown, Wallet, Users as UsersIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  component: FinancePage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function FinancePage() {
  const qc = useQueryClient();
  const subsFn = useServerFn(listSponsorSubs);
  const expFn = useServerFn(listExpenses);

  const subs = useQuery({ queryKey: ["fin-subs"], queryFn: () => subsFn() });
  const exps = useQuery({ queryKey: ["fin-exps"], queryFn: () => expFn() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["fin-subs"] });
    qc.invalidateQueries({ queryKey: ["fin-exps"] });
  };

  const stats = useMemo(() => {
    const active = (subs.data ?? []).filter((s) => s.status === "active");
    const mrr = active.reduce((sum, s) => sum + Number(s.monthly_amount), 0);
    const monthlyExpenses = (exps.data ?? []).reduce((sum, e) => {
      const amt = Number(e.amount);
      if (e.is_recurring && e.recurring_interval === "monthly") return sum + amt;
      if (e.is_recurring && e.recurring_interval === "yearly") return sum + amt / 12;
      return sum;
    }, 0);
    const ytdExpenses = (exps.data ?? [])
      .filter((e) => new Date(e.occurred_on).getFullYear() === new Date().getFullYear())
      .reduce((s, e) => s + Number(e.amount), 0);
    return {
      mrr,
      arr: mrr * 12,
      activeSponsors: active.length,
      monthlyExpenses,
      ytdExpenses,
      netMonthly: mrr - monthlyExpenses,
    };
  }, [subs.data, exps.data]);

  if (subs.isLoading || exps.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="MRR" value={fmt(stats.mrr)} sub={`${fmt(stats.arr)} ARR`} />
        <StatCard icon={<UsersIcon className="h-4 w-4" />} label="Active sponsors" value={String(stats.activeSponsors)} />
        <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Monthly expenses" value={fmt(stats.monthlyExpenses)} sub={`${fmt(stats.ytdExpenses)} YTD`} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Net monthly" value={fmt(stats.netMonthly)} highlight={stats.netMonthly >= 0} />
      </div>

      {/* Sponsor subscriptions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight">Sponsor revenue</h2>
          <NewSubDialog onSaved={refresh} />
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Tier</th>
                <th className="px-5 py-3">Monthly</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(subs.data ?? []).map((s) => (
                <SubRow key={s.id} sub={s} onChanged={refresh} />
              ))}
              {(subs.data ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No sponsors yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expenses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight">Expenses</h2>
          <NewExpenseDialog onSaved={refresh} />
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Recurring</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(exps.data ?? []).map((e) => (
                <ExpenseRow key={e.id} exp={e} onChanged={refresh} />
              ))}
              {(exps.data ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No expenses logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] ${highlight === false ? "border-destructive/40" : ""}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SubRow({ sub, onChanged }: { sub: any; onChanged: () => void }) {
  const update = useServerFn(updateSponsorSub);
  const del = useServerFn(deleteSponsorSub);

  const setStatus = async (status: string) => {
    try {
      await update({ data: { id: sub.id, patch: { status: status as any } } });
      toast.success("Updated");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onDelete = async () => {
    if (!confirm(`Delete sponsor ${sub.business_name}?`)) return;
    try { await del({ data: { id: sub.id } }); toast.success("Deleted"); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <tr className="border-t border-border/60">
      <td className="px-5 py-4">
        <p className="font-medium">{sub.business_name}</p>
        {sub.contact_email && <p className="text-xs text-muted-foreground">{sub.contact_email}</p>}
      </td>
      <td className="px-5 py-4 text-foreground/70">{sub.tier_key ?? "—"}</td>
      <td className="px-5 py-4 font-medium">{fmt(Number(sub.monthly_amount))}</td>
      <td className="px-5 py-4">
        <Select value={sub.status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-5 py-4 text-muted-foreground">{sub.started_on}</td>
      <td className="px-5 py-4 text-right">
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

function ExpenseRow({ exp, onChanged }: { exp: any; onChanged: () => void }) {
  const del = useServerFn(deleteExpense);
  const onDelete = async () => {
    if (!confirm("Delete this expense?")) return;
    try { await del({ data: { id: exp.id } }); toast.success("Deleted"); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <tr className="border-t border-border/60">
      <td className="px-5 py-4 text-muted-foreground">{exp.occurred_on}</td>
      <td className="px-5 py-4 capitalize">{exp.category}</td>
      <td className="px-5 py-4">{exp.vendor ?? "—"}</td>
      <td className="px-5 py-4 text-foreground/70">{exp.description ?? "—"}</td>
      <td className="px-5 py-4 font-medium">{fmt(Number(exp.amount))}</td>
      <td className="px-5 py-4 text-muted-foreground">
        {exp.is_recurring ? exp.recurring_interval ?? "yes" : "—"}
      </td>
      <td className="px-5 py-4 text-right">
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

function NewSubDialog({ onSaved }: { onSaved: () => void }) {
  const create = useServerFn(createSponsorSub);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    business_name: "", contact_email: "", tier_key: "",
    monthly_amount: "", started_on: new Date().toISOString().slice(0, 10), notes: "",
  });

  const submit = async () => {
    setBusy(true);
    try {
      await create({ data: {
        business_name: f.business_name,
        contact_email: f.contact_email || null,
        tier_key: f.tier_key || null,
        monthly_amount: Number(f.monthly_amount),
        started_on: f.started_on,
        status: "active",
        notes: f.notes || null,
      } as any });
      toast.success("Sponsor added");
      setOpen(false);
      setF({ business_name: "", contact_email: "", tier_key: "", monthly_amount: "", started_on: new Date().toISOString().slice(0, 10), notes: "" });
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-1 h-4 w-4" /> Add sponsor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add sponsor subscription</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Business name</Label><Input value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></div>
          <div><Label>Contact email</Label><Input type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tier</Label><Input placeholder="e.g. Featured" value={f.tier_key} onChange={(e) => setF({ ...f, tier_key: e.target.value })} /></div>
            <div><Label>Monthly $</Label><Input type="number" step="0.01" value={f.monthly_amount} onChange={(e) => setF({ ...f, monthly_amount: e.target.value })} /></div>
          </div>
          <div><Label>Started on</Label><Input type="date" value={f.started_on} onChange={(e) => setF({ ...f, started_on: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !f.business_name || !f.monthly_amount}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewExpenseDialog({ onSaved }: { onSaved: () => void }) {
  const create = useServerFn(createExpense);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    category: "domain", vendor: "", description: "", amount: "",
    occurred_on: new Date().toISOString().slice(0, 10),
    is_recurring: false, recurring_interval: "monthly" as "monthly" | "yearly",
    notes: "",
  });

  const submit = async () => {
    setBusy(true);
    try {
      await create({ data: {
        category: f.category,
        vendor: f.vendor || null,
        description: f.description || null,
        amount: Number(f.amount),
        occurred_on: f.occurred_on,
        is_recurring: f.is_recurring,
        recurring_interval: f.is_recurring ? f.recurring_interval : null,
        notes: f.notes || null,
      } as any });
      toast.success("Expense added");
      setOpen(false);
      setF({ category: "domain", vendor: "", description: "", amount: "", occurred_on: new Date().toISOString().slice(0, 10), is_recurring: false, recurring_interval: "monthly", notes: "" });
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-1 h-4 w-4" /> Add expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="domain">Domain</SelectItem>
                  <SelectItem value="hosting">Hosting</SelectItem>
                  <SelectItem value="advertising">Advertising</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount $</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          </div>
          <div><Label>Vendor</Label><Input value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></div>
          <div><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={f.occurred_on} onChange={(e) => setF({ ...f, occurred_on: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <input id="rec" type="checkbox" checked={f.is_recurring} onChange={(e) => setF({ ...f, is_recurring: e.target.checked })} />
            <Label htmlFor="rec" className="m-0">Recurring</Label>
            {f.is_recurring && (
              <Select value={f.recurring_interval} onValueChange={(v) => setF({ ...f, recurring_interval: v as any })}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !f.amount}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
