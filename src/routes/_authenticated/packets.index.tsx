import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { listMyPackets } from "@/lib/packets";
import { Button } from "@/components/ui/button";
import { FilePlus2, Eye } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/packets/")({
  component: PacketsList,
});

function PacketsList() {
  const { user } = useAuth();
  const { data: packets = [], isLoading } = useQuery({
    queryKey: ["packets", user?.id],
    queryFn: () => listMyPackets(user!.id),
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">// All packets</p>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
            Welcome packets
          </h1>
        </div>
        <Button asChild className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/packets/new"><FilePlus2 className="mr-1 h-4 w-4" /> New Handbook</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">Loading…</div>
      ) : packets.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          No packets yet. Create your first to get started.
        </div>
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
              {packets.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-5 py-4 font-medium">{p.buyer_first_name} {p.buyer_last_name ?? ""}</td>
                  <td className="px-5 py-4 text-foreground/70">{p.address}</td>
                  <td className="px-5 py-4">
                    <span className={"inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider " + (p.status === "generated" ? "bg-[color:var(--wi-pine)]/15 text-[color:var(--wi-pine)]" : "bg-secondary text-foreground/70")}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {format(new Date(p.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link to="/packets/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
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
  );
}
