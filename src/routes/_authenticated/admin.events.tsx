import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListEvents } from "@/lib/admin.functions";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/events")({
  component: AdminEvents,
});

function AdminEvents() {
  const fetchEvents = useServerFn(adminListEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => fetchEvents({ data: { limit: 200 } }),
  });

  if (isLoading || !data)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-5 py-3">When</th>
            <th className="px-5 py-3">Event</th>
            <th className="px-5 py-3">Source</th>
            <th className="px-5 py-3">Device</th>
            <th className="px-5 py-3">Location</th>
            <th className="px-5 py-3">Packet</th>
          </tr>
        </thead>
        <tbody>
          {data.events.map((e) => (
            <tr key={e.id} className="border-t border-border/60">
              <td className="px-5 py-3 text-muted-foreground">
                {format(new Date(e.created_at), "MMM d, HH:mm")}
              </td>
              <td className="px-5 py-3 font-medium">{e.event_type}</td>
              <td className="px-5 py-3">{e.source}</td>
              <td className="px-5 py-3">{e.device}</td>
              <td className="px-5 py-3 text-muted-foreground">
                {[e.ip_city, e.ip_region, e.ip_country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-5 py-3 text-xs text-muted-foreground">
                {e.packet_id?.slice(0, 8) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
