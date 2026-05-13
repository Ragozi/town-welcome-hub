import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListSubscribers } from "@/lib/subscriber.functions";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  component: AdminSubscribers,
});

function AdminSubscribers() {
  const fn = useServerFn(adminListSubscribers);
  const { data, isLoading } = useQuery({ queryKey: ["admin-subscribers"], queryFn: () => fn() });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const exportCsv = () => {
    const rows = [
      ["Email", "Name", "Town", "Interests", "Kids", "Pets", "Onboarded", "Opt-ins", "Joined"],
      ...data.subscribers.map((s) => [
        s.email,
        s.full_name ?? "",
        s.town_name ?? "",
        (s.interest_tags ?? []).join("|"),
        s.has_kids ? "yes" : "",
        s.has_pets ? "yes" : "",
        s.onboarded ? "yes" : "",
        s.opt_ins.join("|"),
        new Date(s.created_at).toISOString().slice(0, 10),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{data.total} total · {data.withOptIns} opted into at least one topic</p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="rounded-full">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-foreground/5 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Name</th>
              <th className="p-3">Town</th>
              <th className="p-3">Interests</th>
              <th className="p-3">Opt-ins</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.subscribers.map((s) => (
              <tr key={s.user_id} className="border-t border-border">
                <td className="p-3 font-medium">{s.email}</td>
                <td className="p-3">{s.full_name ?? "—"}</td>
                <td className="p-3">{s.town_name ?? "—"}</td>
                <td className="p-3 text-xs">{(s.interest_tags ?? []).join(", ") || "—"}</td>
                <td className="p-3 text-xs">{s.opt_ins.join(", ") || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
