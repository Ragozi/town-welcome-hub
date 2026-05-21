import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { PDFViewer, PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Eye, Loader2, Sparkles, Printer } from "lucide-react";
import { HandbookDocument } from "@/lib/pdf/handbook-document";
import type { HandbookData } from "@/lib/handbook.functions";
import { recordPdfDownload } from "@/lib/packet-downloads.functions";

type Props = {
  data: HandbookData;
  liveUrl: string;
};

type Variant = "color" | "print";

export function HandbookPdfPanel({ data, liveUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const recordDownload = useServerFn(recordPdfDownload);
  const qc = useQueryClient();
  const lastDownloadAt = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`${liveUrl}?s=qr`, { margin: 0, width: 320 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [liveUrl]);

  const colorDoc = useMemo(
    () => (
      <HandbookDocument
        packet={data.packet}
        realtor={data.realtor}
        town={data.town}
        categories={data.categories}
        businesses={data.businesses}
        recommended={data.recommended}
        qrDataUrl={qrDataUrl}
        liveUrl={liveUrl}
        variant="color"
      />
    ),
    [data, qrDataUrl, liveUrl],
  );

  const printDoc = useMemo(
    () => (
      <HandbookDocument
        packet={data.packet}
        realtor={data.realtor}
        town={data.town}
        categories={data.categories}
        businesses={data.businesses}
        recommended={data.recommended}
        qrDataUrl={qrDataUrl}
        liveUrl={liveUrl}
        variant="print"
      />
    ),
    [data, qrDataUrl, liveUrl],
  );

  const baseName = useMemo(
    () =>
      `${data.packet.buyer_first_name}-welcome-${data.packet.slug}`.replace(
        /[^a-zA-Z0-9-]/g,
        "",
      ),
    [data.packet],
  );

  const recordOnce = (variant: Variant) => {
    const now = Date.now();
    if (now - lastDownloadAt.current < 2000) return;
    lastDownloadAt.current = now;
    recordDownload({ data: { slug: data.packet.slug, variant } })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["packets"] });
        qc.invalidateQueries({ queryKey: ["packet", data.packet.id] });
      })
      .catch((e: unknown) => {
        console.warn("[recordPdfDownload]", e);
      });
    setDialogOpen(false);
  };

  const openInNewTab = async () => {
    try {
      const blob = await pdf(colorDoc).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error("[pdf] open failed", e);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">// PDF preview</p>
          <h2 className="font-display mt-1 text-lg font-extrabold uppercase tracking-tight">
            Closing-day handbook
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={openInNewTab}>
            <Eye className="mr-1 h-4 w-4" /> Open
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full">
                <Download className="mr-1 h-4 w-4" /> Download
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Choose a download version</DialogTitle>
                <DialogDescription>
                  Same layout, two ways to use it.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 grid gap-3">
                <DownloadOptionCard
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Full Color PDF"
                  description="Branded version with full images, colors, and sponsor highlights. Best for digital viewing and premium printing."
                  doc={colorDoc}
                  fileName={`${baseName}.pdf`}
                  onClick={() => recordOnce("color")}
                />
                <DownloadOptionCard
                  icon={<Printer className="h-5 w-5" />}
                  title="Print-Friendly PDF"
                  description="Reduced color, white backgrounds, and high contrast. Optimized for home printers and lower ink usage."
                  doc={printDoc}
                  fileName={`${baseName}-print.pdf`}
                  onClick={() => recordOnce("print")}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
        <PDFViewer showToolbar={false} className="h-[520px] w-full">
          {colorDoc}
        </PDFViewer>
      </div>
    </div>
  );
}

function DownloadOptionCard({
  icon,
  title,
  description,
  doc,
  fileName,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  doc: React.ReactElement;
  fileName: string;
  onClick: () => void;
}) {
  return (
    <PDFDownloadLink
      document={doc}
      fileName={fileName}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-accent"
      onClick={onClick}
    >
      {({ loading }) => (
        <>
          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
          <div className="flex-1">
            <p className="font-display text-sm font-extrabold uppercase tracking-tight">
              {title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="self-center text-xs font-medium text-primary">
            {loading ? (
              <>
                <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <Download className="mr-1 inline h-4 w-4" />
                Download
              </>
            )}
          </div>
        </>
      )}
    </PDFDownloadLink>
  );
}
