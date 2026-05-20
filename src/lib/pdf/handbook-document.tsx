import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { tierPriority, type Business, type Category, type Town } from "@/lib/towns";
import type { Packet } from "@/lib/packets";
import type { HandbookRealtor } from "@/lib/handbook.functions";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1410",
    backgroundColor: "#F9F2E8",
  },
  cover: { padding: 0, fontFamily: "Helvetica", color: "#1a1410", backgroundColor: "#F9F2E8" },
  coverImageWrap: { height: 280, backgroundColor: "#F9F2E8", position: "relative" },
  coverImage: { width: "100%", height: "100%", objectFit: "cover" },
  coverOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(26,20,16,0.15)" },
  coverImageFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    backgroundColor: "#F9F2E8",
    opacity: 0.6,
  },
  coverHeroNoPhoto: {
    height: 200,
    backgroundColor: "#F9F2E8",
    paddingHorizontal: 36,
    paddingTop: 56,
    paddingBottom: 24,
    position: "relative",
  },
  coverHeroEyebrow: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FF6B00",
  },
  coverHeroTitle: {
    fontSize: 30,
    fontWeight: 700,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: -0.5,
    color: "#1a1410",
  },
  coverHeroSubtitle: {
    fontSize: 10,
    marginTop: 10,
    color: "#6a5a48",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  coverHeroRule: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 0,
    height: 2,
    backgroundColor: "#FF6B00",
  },
  coverContent: { padding: 36 },
  brand: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FF6B00",
  },
  buyerTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  buyerAddr: { fontSize: 12, marginTop: 6, color: "#6a5a48" },
  noteBox: {
    marginTop: 22,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    border: "1 solid #f0d6b6",
  },
  noteEyebrow: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "#FF6B00",
    textTransform: "uppercase",
  },
  note: { fontSize: 10, marginTop: 6, lineHeight: 1.5 },
  agentRow: { flexDirection: "row", marginTop: 18, alignItems: "center", gap: 12 },
  agentBlock: { flex: 1 },
  agentName: { fontSize: 14, fontWeight: 700, textTransform: "uppercase" },
  agentBrokerage: { fontSize: 9, color: "#6a5a48", marginTop: 2 },
  agentMeta: { fontSize: 9, color: "#6a5a48", marginTop: 6 },
  qr: { width: 78, height: 78 },
  qrCaption: { fontSize: 7, textAlign: "center", color: "#6a5a48", marginTop: 2, maxWidth: 90 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1 solid #e7d9c5",
  },
  pageTitle: { fontSize: 18, fontWeight: 700, textTransform: "uppercase" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
    color: "#FF6B00",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1 solid #f5d8b8",
    paddingBottom: 3,
  },
  featuredRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  featuredCard: {
    flex: 1,
    border: "1 solid #f0d6b6",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 6,
  },
  bizName: { fontSize: 10, fontWeight: 700 },
  bizMeta: { fontSize: 8, color: "#6a5a48", marginTop: 1 },
  coupon: { fontSize: 8, color: "#FF6B00", marginTop: 3, fontWeight: 700 },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  catTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bizRow: { marginBottom: 5 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#6a5a48",
    textAlign: "center",
  },
  thankYouPage: {
    padding: 36,
    backgroundColor: "#1a1410",
    color: "#F9F2E8",
    fontFamily: "Helvetica",
  },
  thankBig: { fontSize: 32, fontWeight: 700, textTransform: "uppercase", marginTop: 24 },
  thankBody: {
    fontSize: 11,
    marginTop: 12,
    color: "rgba(249,242,232,0.85)",
    lineHeight: 1.6,
    maxWidth: 380,
  },
  thankAgent: { marginTop: 28, fontSize: 11, color: "rgba(249,242,232,0.7)" },
  thankCta: {
    marginTop: 14,
    padding: 12,
    border: "1 solid rgba(249,242,232,0.25)",
    borderRadius: 8,
  },
});

export type HandbookDocumentProps = {
  packet: Packet;
  realtor: HandbookRealtor | null;
  town: Town | null;
  categories: Category[];
  businesses: Business[];
  qrDataUrl: string;
  liveUrl: string;
};

export function HandbookDocument({
  packet,
  realtor,
  town,
  categories,
  businesses,
  qrDataUrl,
  liveUrl,
}: HandbookDocumentProps) {
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
      <Page size="A4" style={styles.cover}>
        {packet.home_photo_url ? (
          <View style={styles.coverImageWrap}>
            <Image src={packet.home_photo_url} style={styles.coverImage} />
            <View style={styles.coverOverlay} />
            <View style={styles.coverImageFade} />
          </View>
        ) : (
          <View style={styles.coverHeroNoPhoto}>
            <Text style={styles.coverHeroEyebrow}>// Welcome Home</Text>
            <Text style={styles.coverHeroTitle}>
              {town ? `${town.name}, ${town.state}` : "Your new home"}
            </Text>
            <Text style={styles.coverHeroSubtitle}>
              A handbook for {packet.buyer_first_name}
              {packet.buyer_last_name ? ` & ${packet.buyer_last_name}` : ""}
            </Text>
            <View style={styles.coverHeroRule} />
          </View>
        )}

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
            {qrDataUrl ? (
              <View>
                <Image src={qrDataUrl} style={styles.qr} />
                <Text style={styles.qrCaption}>Scan for live page</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={styles.footer}>Welcome Home · {liveUrl}</Text>
      </Page>

      {town && cats.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>// Around {town.name}</Text>
              <Text style={styles.pageTitle}>Your neighborhood</Text>
            </View>
            {qrDataUrl ? (
              <View>
                <Image src={qrDataUrl} style={styles.qr} />
                <Text style={styles.qrCaption}>Live updates online</Text>
              </View>
            ) : null}
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

      <Page size="A4" style={styles.thankYouPage}>
        <Text style={styles.brand}>// Thank you</Text>
        <Text style={styles.thankBig}>Thank you, {packet.buyer_first_name}.</Text>
        <Text style={styles.thankBody}>
          It has been an honor helping you find home. If a friend or family member is thinking
          about a move, I would love to help them too. Your trust means the world.
        </Text>

        <View style={styles.thankCta}>
          <Text
            style={{
              fontSize: 9,
              color: "#FF6B00",
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
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
      tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] || a.name.localeCompare(b.name),
  );
  return (
    <View>
      <Text style={styles.catTitle}>{category.name}</Text>
      {sorted.map((b) => (
        <View key={b.id} style={styles.bizRow}>
          <Text style={styles.bizName}>{b.name}</Text>
          {(b.phone || b.address) && (
            <Text style={styles.bizMeta}>{[b.phone, b.address].filter(Boolean).join(" · ")}</Text>
          )}
          {b.coupon_text && <Text style={styles.coupon}>* {b.coupon_text}</Text>}
        </View>
      ))}
    </View>
  );
}
