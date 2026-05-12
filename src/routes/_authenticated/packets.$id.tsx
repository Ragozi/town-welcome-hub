import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPacketById, deletePacket } from "@/lib/packets";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Download, Trash2, Mail, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/packets/$id")({
  component: PacketDetail,
});

function PacketDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const { data: packet, isLoading } = useQuery({
    queryKey: ["packet", id],
    queryFn: () => getPacketById(id),
    enabled: !!user,
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!packet) {
    return <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">Packet not found.</div>;
  }

  const liveUrl = origin ? `${origin}/p/${packet.slug}` : `/p/${packet.slug}`;

  const onDelete = async () => {
    if (!confirm("Delete this packet? This cannot be undone.")) return;
    try {
      await deletePacket(packet.id);
      toast.success("Packet deleted.");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error("Could not delete.", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <p className="eyebrow">// Packet</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold uppercase tracking-tight">
            {packet.buyer_first_name} {packet.buyer_last_name ?? ""}
          </h1>
          <p className="mt-1 text-foreground/70">{packet.address}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Closing date" value={packet.closing_date ?? "—"} />
            <Info label="Buyer email" value={packet.buyer_email ?? "—"} />
            <Info label="Status" value={packet.status} />
            <Info label="Created" value={new Date(packet.created_at).toLocaleDateString()} />
          </div>

          {packet.welcome_note && (
            <div className="mt-6 rounded-2xl border border-border bg-secondary/30 p-5">
              <p className="eyebrow mb-2">// Welcome note</p>
              <p className="whitespace-pre-line text-foreground/80">{packet.welcome_note}</p>
            </div>
          )}

          {(packet.interests.length > 0 || packet.lifestyle_tags.length > 0) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {[...packet.interests, ...packet.lifestyle_tags].map((t) => (
                <span key={t} className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium">{t}</span>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" /> Open buyer page
              </a>
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                navigator.clipboard.writeText(liveUrl);
                toast.success("Link copied.");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy link
            </Button>
            {packet.buyer_email && (
              <Button
                variant="outline"
                className="rounded-full"
                asChild
              >
                <a href={`mailto:${packet.buyer_email}?subject=Welcome%20Home&body=${encodeURIComponent(`Welcome home! Here's your personalized neighborhood guide:\n\n${liveUrl}`)}`}>
                  <Mail className="mr-1 h-4 w-4" /> Email buyer
                </a>
              </Button>
            )}
            <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <p className="eyebrow mb-3">// Buyer QR</p>
            {origin && (
              <div className="flex justify-center rounded-2xl bg-background p-5">
                <QRCodeSVG value={liveUrl} size={200} level="M" />
              </div>
            )}
            <p className="mt-3 break-all text-center text-xs text-muted-foreground">{liveUrl}</p>
          </div>

          <div className="rounded-3xl border border-border bg-foreground p-6 text-background shadow-[var(--shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-background/60">// PDF packet</p>
            <p className="mt-2 text-sm text-background/80">Print-ready, branded packet for the closing table.</p>
            <Button asChild className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <a href={`/api/packet-pdf/${packet.slug}`} target="_blank" rel="noreferrer">
                <Download className="mr-1 h-4 w-4" /> Download PDF
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
