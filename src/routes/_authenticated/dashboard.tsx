import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { listMyPackets } from "@/lib/packets";
import { Button } from "@/components/ui/button";
import { ArrowRight, FilePlus2, FileText, Sparkles, Users, Download, Eye } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const { data: packets = [], isLoading } = useQuery({
    queryKey: ["packets", user?.id],
    queryFn: () => listMyPackets(user!.id),
    enabled: !!user,
  });

  const generated = packets.filter((p) => p.status === "generated");
  const drafts = packets.filter((p) => p.status === "draft");
  const totalDownloads = packets.reduce((s, p) => s + (p.pdf_download_count ?? 0), 0);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] md:p-12">
        <p className="eyebrow">// Dashboard</p>
        <h1 className="font-display mt-3 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-3 max-w-xl text-foreground/70">
          Create a thoughtful, branded welcome packet for every new buyer. PDF, web page, and QR
          code — generated in under a minute.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            asChild
            className="h-12 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/packets/new">
              <FilePlus2 className="mr-1 h-4 w-4" /> Create Welcome Packet
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full border-foreground/15">
            <Link to="/settings">Branding & profile</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Packets created" value={packets.length} icon={FileText} />
        <StatCard label="Buyers welcomed" value={generated.length} icon={Users} />
        <StatCard label="PDF downloads" value={totalDownloads} icon={Download} />
        <StatCard label="Drafts in progress" value={drafts.length} icon={Sparkles} />
      </div>

      {/* Recent packets */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">// Recent</p>
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
              Welcome packets
            </h2>
          </div>
          <Button
            asChild
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <Link to="/packets">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Loading…
          </div>
        ) : packets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {packets.slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-5 py-4 font-medium">
                      {p.buyer_first_name} {p.buyer_last_name ?? ""}
                    </td>
                    <td className="px-5 py-4 text-foreground/70">{p.address}</td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider " +
                          (p.status === "generated"
                            ? "bg-[color:var(--wi-pine)]/15 text-[color:var(--wi-pine)]"
                            : "bg-secondary text-foreground/70")
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {format(new Date(p.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to="/packets/$id"
                        params={{ id: p.id }}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="font-display mt-3 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
      <Sparkles className="mx-auto h-8 w-8 text-primary" />
      <h3 className="font-display mt-4 text-xl font-extrabold uppercase tracking-tight">
        Your first welcome
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Turn your next closing into a moment your buyer will remember. Build a personalized packet
        in under a minute.
      </p>
      <Button
        asChild
        className="mt-6 h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
      >
        <Link to="/packets/new">
          <FilePlus2 className="mr-1 h-4 w-4" /> Create Welcome Packet
        </Link>
      </Button>
    </div>
  );
}
