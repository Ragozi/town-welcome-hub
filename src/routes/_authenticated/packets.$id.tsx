import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { getPacketById, deletePacket } from "@/lib/packets";
import { issuePdfToken } from "@/lib/public-packet.functions";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ExternalLink,
  Download,
  Trash2,
  Mail,
  Copy,
  Loader2,
  QrCode,
  FileText,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicBaseUrl, packetUrl, packetPdfUrl } from "@/lib/public-url";

export const Route = createFileRoute("/_authenticated/packets/$id")({
  component: PacketDetail,
});

function PacketDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const issueToken = useServerFn(issuePdfToken);

  const { data: packet, isLoading } = useQuery({
    queryKey: ["packet", id],
    queryFn: () => getPacketById(id),
    enabled: !!user,
  });

  const { data: pdfTokenData } = useQuery({
    queryKey: ["pdf-token", packet?.slug],
    queryFn: () => issueToken({ data: { slug: packet!.slug } }),
    enabled: !!packet?.slug,
    staleTime: 1000 * 60 * 60 * 12, // refresh well before 24h expiry
  });
  const tokenQuery = pdfTokenData?.token ? `t=${encodeURIComponent(pdfTokenData.token)}` : "";
  const pdfPreviewUrl = packet && tokenQuery ? `/api/packet-pdf/${packet.slug}?${tokenQuery}` : "";
  const pdfDownloadUrl =
    packet && tokenQuery ? `/api/packet-pdf/${packet.slug}?${tokenQuery}&download=1` : "";
  const pdfShareUrl = packet && tokenQuery ? `${packetPdfUrl(packet.slug)}?${tokenQuery}` : "";

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!packet) {
    return (
      <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
        Packet not found.
      </div>
    );
  }

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

  const downloadQrPng = () => {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `welcome-${packet.slug}-qr.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
  };

  return (
    <div className="space-y-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="space-y-6">
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
                  <span
                    key={t}
                    className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
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
                <Button variant="outline" className="rounded-full" asChild>
                  <a
                    href={`mailto:${packet.buyer_email}?subject=Welcome%20Home&body=${encodeURIComponent(`Welcome home! Here's your personalized neighborhood guide:\n\n${liveUrl}`)}`}
                  >
                    <Mail className="mr-1 h-4 w-4" /> Email buyer
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>

          {/* PDF preview */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">// PDF preview</p>
                <h2 className="font-display mt-1 text-lg font-extrabold uppercase tracking-tight">
                  Closing-day packet
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={pdfPreviewUrl} target="_blank" rel="noreferrer">
                    <Eye className="mr-1 h-4 w-4" /> Open
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <a href={pdfDownloadUrl}>
                    <Download className="mr-1 h-4 w-4" /> Download
                  </a>
                </Button>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
              <iframe
                src={pdfPreviewUrl}
                title="Packet PDF preview"
                loading="lazy"
                className="h-[520px] w-full"
              />
            </div>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              Direct link:{" "}
              <a href={pdfShareUrl || pdfPreviewUrl} className="hover:text-foreground">
                {pdfShareUrl || pdfPreviewUrl}
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              <p className="eyebrow !mb-0">// Buyer QR</p>
            </div>
            <div ref={qrWrapRef} className="mt-4 flex justify-center rounded-2xl bg-background p-5">
              <QRCodeSVG
                value={liveUrl || `/p/${packet.slug}`}
                size={220}
                level="M"
                includeMargin
              />
            </div>
            <p className="mt-3 break-all text-center text-xs text-muted-foreground">{liveUrl}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={downloadQrPng}>
                <Download className="mr-1 h-4 w-4" /> PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  navigator.clipboard.writeText(liveUrl);
                  toast.success("Link copied.");
                }}
              >
                <Copy className="mr-1 h-4 w-4" /> Link
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-foreground p-6 text-background shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-background/60">
                // Share
              </p>
            </div>
            <p className="mt-2 text-sm text-background/80">
              Send the packet link or the printable PDF.
            </p>
            <div className="mt-4 space-y-2">
              <Button
                asChild
                className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <a href={pdfDownloadUrl}>
                  <Download className="mr-1 h-4 w-4" /> Download PDF
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full border-background/20 bg-transparent text-background hover:bg-background/10"
              >
                <a href={liveUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" /> Open buyer page
                </a>
              </Button>
            </div>
            {!getPublicBaseUrl() && (
              <p className="mt-3 text-[10px] uppercase tracking-wider text-background/50">
                Set PUBLIC_BASE_URL once a domain is attached.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
