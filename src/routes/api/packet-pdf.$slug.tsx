import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToStream,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { tierPriority, type Business, type Category, type Town } from "@/lib/towns";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Packet } from "@/lib/packets";
import { getPublicBaseUrl } from "@/lib/public-url";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1410", backgroundColor: "#F9F2E8" },
  cover: { padding: 0, fontFamily: "Helvetica", color: "#1a1410", backgroundColor: "#F9F2E8" },
  coverImageWrap: { height: 360, backgroundColor: "#1a1410", position: "relative" },
  coverImage: { width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 },
  coverOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(26,20,16,0.35)" },
  coverContent: { padding: 36 },
  brand: { fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#FF6B00" },
  buyerTitle: { fontSize: 36, fontWeight: 700, marginTop: 10, textTransform: "uppercase", letterSpacing: -0.5 },
  buyerAddr: { fontSize: 12, marginTop: 6, color: "#6a5a48" },
  noteBox: { marginTop: 22, padding: 16, borderRadius: 8, backgroundColor: "#FFFFFF", border: "1 solid #f0d6b6" },
  noteEyebrow: { fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: "#FF6B00", textTransform: "uppercase" },
  note: { fontSize: 10, marginTop: 6, lineHeight: 1.5 },
  agentRow: { flexDirection: "row", marginTop: 18, alignItems: "center", gap: 12 },
  agentBlock: { flex: 1 },
  agentName: { fontSize: 14, fontWeight: 700, textTransform: "uppercase" },
  agentBrokerage: { fontSize: 9, color: "#6a5a48", marginTop: 2 },
  agentMeta: { fontSize: 9, color: "#6a5a48", marginTop: 6 },
  qr: { width: 78, height: 78 },
  qrCaption: { fontSize: 7, textAlign: "center", color: "#6a5a48", marginTop: 2, maxWidth: 90 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "1 solid #e7d9c5" },
  pageTitle: { fontSize: 18, fontWeight: 700, textTransform: "uppercase" },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 6,
    color: "#FF6B00", textTransform: "uppercase", letterSpacing: 1,
    borderBottom: "1 solid #f5d8b8", paddingBottom: 3,
  },
  featuredRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  featuredCard: {
    flex: 1, border: "1 solid #f0d6b6", backgroundColor: "#FFFFFF",
    padding: 10, borderRadius: 6,
  },
  bizName: { fontSize: 10, fontWeight: 700 },
  bizMeta: { fontSize: 8, color: "#6a5a48", marginTop: 1 },
  coupon: { fontSize: 8, color: "#FF6B00", marginTop: 3, fontWeight: 700 },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  catTitle: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  bizRow: { marginBottom: 5 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 7, color: "#6a5a48", textAlign: "center" },
  thankYouPage: { padding: 36, backgroundColor: "#1a1410", color: "#F9F2E8", fontFamily: "Helvetica" },
  thankBig: { fontSize: 32, fontWeight: 700, textTransform: "uppercase", marginTop: 24 },
  thankBody: { fontSize: 11, marginTop: 12, color: "rgba(249,242,232,0.85)", lineHeight: 1.6, maxWidth: 380 },
  thankAgent: { marginTop: 28, fontSize: 11, color: "rgba(249,242,232,0.7)" },
  thankCta: { marginTop: 14, padding: 12, border: "1 solid rgba(249,242,232,0.25)", borderRadius: 8 },
});

export const Route = createFileRoute("/api/packet-pdf/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = params.slug;
        const { data: packet } = await supabaseAdmin
          .from("packets")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (!packet) return new Response("Not found", { status: 404 });
        const p = packet as unknown as Packet;

        const [{ data: profile }, { data: town }, { data: categories }] = await Promise.all([
          supabaseAdmin.from("profiles").select("*").eq("user_id", p.realtor_id).maybeSingle(),
          p.town_id
            ? supabaseAdmin.from("towns").select("*").eq("id", p.town_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabaseAdmin.from("categories").select("*").order("display_order"),
        ]);

        let businesses: Business[] = [];
        if (town) {
          const { data: bizData } = await supabaseAdmin
            .from("businesses")
            .select("*")
            .eq("town_id", (town as Town).id);
          businesses = (bizData ?? []) as Business[];
        }

        const origin = getPublicBaseUrl(request);
        const liveUrl = `${origin}/p/${slug}?s=qr`;
        const qrDataUrl = await QRCode.toDataURL(liveUrl, { margin: 0, width: 320 });

        const doc = createElement(PacketPdf, {
          packet: p,
          realtor: profile as any,
          town: (town as Town | null) ?? null,
          categories: (categories ?? []) as Category[],
          businesses,
          qrDataUrl,
          liveUrl: `${origin}/p/${slug}`,
        });

        const stream = await renderToStream(doc as any);

        // Track + bump counter (fire-and-forget)
        supabaseAdmin
          .from("packet_events")
          .insert({
            packet_id: p.id,
            realtor_id: p.realtor_id,
            town_id: p.town_id ?? null,
            event_type: "pdf_downloaded",
            source: "direct",
            user_agent: request.headers.get("user-agent"),
            ip_country: request.headers.get("cf-ipcountry"),
            ip_region: request.headers.get("cf-region"),
            ip_city: request.headers.get("cf-ipcity"),
          })
          .then(() => {});
        supabaseAdmin
          .from("packets")
          .update({
            status: "generated",
            pdf_download_count: (p.pdf_download_count ?? 0) + 1,
          })
          .eq("id", p.id)
          .then(() => {});

        const safeName = `${p.buyer_first_name}-welcome-${slug}`.replace(/[^a-zA-Z0-9-]/g, "");
        const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
        const disposition = wantsDownload ? "attachment" : "inline";
        return new Response(stream as any, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${disposition}; filename="${safeName}.pdf"`,
            "Cache-Control": "private, max-age=60",
          },
        });
      },
    },
  },
});

function PacketPdf({
  packet,
  realtor,
  town,
  categories,
  businesses,
  qrDataUrl,
  liveUrl,
}: {
  packet: Packet;
  realtor: any;
  town: Town | null;
  categories: Category[];
  businesses: Business[];
  qrDataUrl: string;
  liveUrl: string;
}) {
  const featured = businesses
    .filter((b) => b.sponsor_tier !== "none")
    .sort(
      (a, b) =>
        tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
        a.featured_order - b.featured_order,
    )
    .slice(0, 4);

  const byCategory = new Map<string, Business[]>();
  for (const b of businesses) {
    const arr = byCategory.get(b.category_id) ?? [];
    arr.push(b);
    byCategory.set(b.category_id, arr);
  }
  const cats = categories.filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0);
  const half = Math.ceil(cats.length / 2);
  const left = cats.slice(0, half);
  const right = cats.slice(half);

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverImageWrap}>
          {packet.home_photo_url ? (
            <Image src={packet.home_photo_url} style={styles.coverImage} />
          ) : null}
          <View style={styles.coverOverlay} />
        </View>
        <View style={styles.coverContent}>
          <Text style={styles.brand}>// Welcome Home</Text>
          <Text style={styles.buyerTitle}>
            {packet.buyer_first_name}
            {packet.buyer_last_name ? ` & ${packet.buyer_last_name}` : ""}
          </Text>
          <Text style={styles.buyerAddr}>
            {packet.address}
            {town ? ` · ${town.name}, ${town.state}` : ""}
          </Text>

          {packet.welcome_note && (
            <View style={styles.noteBox}>
              <Text style={styles.noteEyebrow}>// A note from your realtor</Text>
              <Text style={styles.note}>{packet.welcome_note}</Text>
            </View>
          )}

          <View style={styles.agentRow}>
            <View style={styles.agentBlock}>
              <Text style={styles.agentName}>{realtor?.full_name ?? ""}</Text>
              {realtor?.brokerage_name && (
                <Text style={styles.agentBrokerage}>{realtor.brokerage_name}</Text>
              )}
              <Text style={styles.agentMeta}>
                {[realtor?.email_public, realtor?.phone].filter(Boolean).join("  ·  ")}
              </Text>
            </View>
            <View>
              <Image src={qrDataUrl} style={styles.qr} />
              <Text style={styles.qrCaption}>Scan for live page</Text>
            </View>
          </View>
        </View>
        <Text style={styles.footer}>Welcome Home · {liveUrl}</Text>
      </Page>

      {/* Town directory */}
      {town && cats.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>// Around {town.name}</Text>
              <Text style={styles.pageTitle}>Your neighborhood</Text>
            </View>
            <View>
              <Image src={qrDataUrl} style={styles.qr} />
              <Text style={styles.qrCaption}>Live updates online</Text>
            </View>
          </View>

          {featured.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Locals we love</Text>
              <View style={styles.featuredRow}>
                {featured.slice(0, 2).map((b) => (
                  <FeaturedCardPdf key={b.id} b={b} />
                ))}
              </View>
              {featured.length > 2 && (
                <View style={styles.featuredRow}>
                  {featured.slice(2, 4).map((b) => (
                    <FeaturedCardPdf key={b.id} b={b} />
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.sectionTitle}>Local directory</Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              {left.map((c) => (
                <CategoryPdf key={c.id} category={c} list={byCategory.get(c.id) ?? []} />
              ))}
            </View>
            <View style={styles.col}>
              {right.map((c) => (
                <CategoryPdf key={c.id} category={c} list={byCategory.get(c.id) ?? []} />
              ))}
            </View>
          </View>

          <Text style={styles.footer}>Welcome Home · {liveUrl}</Text>
        </Page>
      )}

      {/* Thank-you / referral */}
      <Page size="A4" style={styles.thankYouPage}>
        <Text style={styles.brand}>// Thank you</Text>
        <Text style={styles.thankBig}>
          Thank you, {packet.buyer_first_name}.
        </Text>
        <Text style={styles.thankBody}>
          It has been an honor helping you find home. If a friend or family member is
          thinking about a move, I would love to help them too. Your trust means the world.
        </Text>

        <View style={styles.thankCta}>
          <Text style={{ fontSize: 9, color: "#FF6B00", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            // Refer a friend
          </Text>
          <Text style={{ fontSize: 11, marginTop: 6 }}>
            Scan the QR on the cover to open your live welcome page, then tap "Refer a friend."
          </Text>
        </View>

        <Text style={styles.thankAgent}>
          {realtor?.full_name ?? ""}
          {realtor?.brokerage_name ? ` · ${realtor.brokerage_name}` : ""}
          {"\n"}
          {[realtor?.email_public, realtor?.phone].filter(Boolean).join("  ·  ")}
        </Text>
      </Page>
    </Document>
  );
}

function FeaturedCardPdf({ b }: { b: Business }) {
  return (
    <View style={styles.featuredCard}>
      <Text style={styles.bizName}>{b.name}</Text>
      {b.subcategory && <Text style={styles.bizMeta}>{b.subcategory}</Text>}
      {b.description && <Text style={styles.bizMeta}>{b.description}</Text>}
      {b.phone && <Text style={styles.bizMeta}>{b.phone}</Text>}
      {b.address && <Text style={styles.bizMeta}>{b.address}</Text>}
      {b.coupon_text && <Text style={styles.coupon}>* {b.coupon_text}</Text>}
    </View>
  );
}

function CategoryPdf({ category, list }: { category: Category; list: Business[] }) {
  const sorted = [...list].sort(
    (a, b) =>
      tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
      a.name.localeCompare(b.name),
  );
  return (
    <View>
      <Text style={styles.catTitle}>{category.name}</Text>
      {sorted.map((b) => (
        <View key={b.id} style={styles.bizRow}>
          <Text style={styles.bizName}>{b.name}</Text>
          {(b.phone || b.address) && (
            <Text style={styles.bizMeta}>
              {[b.phone, b.address].filter(Boolean).join(" · ")}
            </Text>
          )}
          {b.coupon_text && <Text style={styles.coupon}>* {b.coupon_text}</Text>}
        </View>
      ))}
    </View>
  );
}
