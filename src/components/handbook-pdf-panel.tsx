import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { PDFViewer, PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2 } from "lucide-react";
import { HandbookDocument } from "@/lib/pdf/handbook-document";
import type { HandbookData } from "@/lib/handbook.functions";
import { logEvent } from "@/lib/tracking.functions";

type Props = {
  data: HandbookData;
  // Live URL the QR should point at — derived in the browser so the domain
  // matches what the buyer will actually see.
  liveUrl: string;
};

export function HandbookPdfPanel({ data, liveUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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

  const doc = useMemo(
    () => (
      <HandbookDocument
        packet={data.packet}
        realtor={data.realtor}
        town={data.town}
        categories={data.categories}
        businesses={data.businesses}
        qrDataUrl={qrDataUrl}
        liveUrl={liveUrl}
      />
    ),
    [data, qrDataUrl, liveUrl],
  );

  const fileName = useMemo(() => {
    const safe = `${data.packet.buyer_first_name}-welcome-${data.packet.slug}`.replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    return `${safe}.pdf`;
  }, [data.packet]);

  const openInNewTab = async () => {
    try {
      const blob = await pdf(doc).toBlob();
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
          <PDFDownloadLink
            document={doc}
            fileName={fileName}
            className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              logEvent({
                data: {
                  packet_slug: data.packet.slug,
                  event_type: "pdf_downloaded",
                  source: "direct",
                },
              }).catch(() => {});
            }}
          >
            {({ loading }) =>
              loading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Preparing…
                </>
              ) : (
                <>
                  <Download className="mr-1 h-4 w-4" /> Download
                </>
              )
            }
          </PDFDownloadLink>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
        <PDFViewer showToolbar={false} className="h-[520px] w-full">
          {doc}
        </PDFViewer>
      </div>
    </div>
  );
}
