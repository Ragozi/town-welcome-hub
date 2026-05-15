import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminGetMetrics } from "@/lib/admin.functions";
import { generateQaHandbook, getQaHandbook } from "@/lib/scraped.functions";
import { useAuth } from "@/lib/auth";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { ArrowDown, ArrowUp, Download, FileText, MapPin, MousePointerClick, QrCode, Users2, Loader2, ShieldAlert, LogIn, Beaker, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const COLORS = ["#FF6B00", "#7C9885", "#C73E3A", "#E8B14F", "#6a5a48", "#a99580"];

function AdminOverview() {
  const [days, setDays] = useState(30);
  const { session, isAdmin, loading: authLoading } = useAuth();
  const fetchMetrics = useServerFn(adminGetMetrics);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-metrics", days, session?.user.id],
    enabled: !!session && isAdmin,
    retry: false,
    queryFn: () => fetchMetrics({ data: { days, scope: "admin" } }),
  });

  if (authLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!session) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in required"
        body="Your session has expired or you're not signed in. Please sign in again to view admin metrics."
        action={<Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"><LogIn className="h-4 w-4" /> Go to sign in</Link>}
      />
    );
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admin access only"
        body="This page is restricted to administrators."
      />
    );
  }

  if (error) {
    const status = (error as any)?.status;
    const msg = status === 401
      ? "Your session expired. Please sign in again."
      : status === 403
      ? "You don't have permission to view these metrics."
      : "We couldn't load metrics. The backend returned an error.";
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Couldn't load metrics"
        body={msg}
        action={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-foreground/5">Try again</button>
            {status === 401 && <Link to="/login" className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">Sign in</Link>}
          </div>
        }
      />
    );
  }

  if (isLoading || !data) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Last {days} days vs. previous {days} days</p>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                days === r.days ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <QaHandbookCard />

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Packets" value={data.totals.packets} prev={data.prev.packets} icon={FileText} />
        <KpiCard label="PDF downloads" value={data.totals.pdfs} prev={data.prev.pdfs} icon={Download} />
        <KpiCard label="QR scans" value={data.totals.qr} prev={data.prev.qr} icon={QrCode} />
        <KpiCard label="Landing views" value={data.totals.views} prev={data.prev.views} icon={Users2} />
        <KpiCard label="Referral clicks" value={data.totals.referrals} prev={data.prev.referrals} icon={MousePointerClick} highlight />
        <KpiCard label="Business clicks" value={data.totals.bizClicks} prev={data.prev.bizClicks} icon={MapPin} />
      </div>

      {/* Activity over time */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h3 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">Activity over time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7d9c5" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="views" stroke="#FF6B00" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="qr" stroke="#7C9885" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="pdfs" stroke="#E8B14F" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="referrals" stroke="#C73E3A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">Conversion funnel</h3>
          <div className="space-y-2">
            {data.funnel.map((s, i) => {
              const max = data.funnel[0].value || 1;
              const pct = Math.max(2, Math.round((s.value / max) * 100));
              const conv = i === 0 ? null : data.funnel[i - 1].value
                ? Math.round((s.value / data.funnel[i - 1].value) * 100)
                : 0;
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.stage}</span>
                    <span className="text-muted-foreground">
                      {s.value.toLocaleString()}{conv != null && ` · ${conv}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source donut */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">Traffic source</h3>
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.sources} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {data.sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Devices */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">Device split</h3>
          {data.devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.devices}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7d9c5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#FF6B00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Geo */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">Top locations</h3>
          {data.geo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geo headers not present in this environment yet — data will populate in production.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.geo.map((g) => (
                <li key={g.location} className="flex justify-between py-2">
                  <span>{g.location}</span>
                  <span className="font-semibold">{g.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Leaderboard title="Top realtors (by referrals)" rows={data.topRealtors.map((r) => ({
          name: r.name, primary: r.referrals, secondary: `${r.packets} packets · ${r.views} views`,
        }))} />
        <Leaderboard title="Top towns" rows={data.topTowns.map((t) => ({
          name: t.name, primary: t.views, secondary: `${t.packets} packets`,
        }))} />
        <Leaderboard title="Top businesses (clicks)" rows={data.topBusinesses.map((b) => ({
          name: b.name, primary: b.count, secondary: "clicks",
        }))} />
      </div>
    </div>
  );
}

function KpiCard({
  label, value, prev, icon: Icon, highlight,
}: {
  label: string; value: number; prev: number;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  const delta = prev === 0 ? (value > 0 ? 100 : 0) : Math.round(((value - prev) / prev) * 100);
  const up = delta >= 0;
  return (
    <div
      className={`rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)] ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
      title={`Previous: ${prev.toLocaleString()}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="font-display mt-3 text-3xl font-extrabold">{value.toLocaleString()}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-[color:var(--wi-pine)]" : "text-[color:var(--wi-cranberry)]"}`}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(delta)}% vs prev
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon, title, body, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; body: string; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="font-display mt-3 text-xl font-extrabold uppercase tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

function Leaderboard({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; primary: number; secondary: string }[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h3 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.secondary}</p>
              </div>
              <span className="font-display text-lg font-extrabold">{r.primary.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
