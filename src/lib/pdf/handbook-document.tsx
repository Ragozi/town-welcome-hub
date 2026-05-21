import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { tierPriority, type Business, type Category, type Town } from "@/lib/towns";
import type { Packet } from "@/lib/packets";
import type { HandbookRealtor, HandbookRecommendation } from "@/lib/handbook.functions";

const COLORS_COLOR = {
  pageBg: "#F9F2E8",
  cardBg: "#FFFFFF",
  cardBorder: "#f0d6b6",
  accent: "#FF6B00",
  text: "#1a1410",
  muted: "#6a5a48",
  thankBg: "#1a1410",
  thankText: "#F9F2E8",
  thankBodyMuted: "rgba(249,242,232,0.85)",
  thankAgentMuted: "rgba(249,242,232,0.7)",
  thankCtaBorder: "rgba(249,242,232,0.25)",
  ruleSoft: "#e7d9c5",
  ruleSofter: "#f5d8b8",
  overlay: "rgba(26,20,16,0.15)",
};

const COLORS_PRINT = {
  pageBg: "#FFFFFF",
  cardBg: "#FFFFFF",
  cardBorder: "#999999",
  accent: "#000000",
  text: "#000000",
  muted: "#444444",
  thankBg: "#FFFFFF",
  thankText: "#000000",
  thankBodyMuted: "#333333",
  thankAgentMuted: "#444444",
  thankCtaBorder: "#999999",
  ruleSoft: "#cccccc",
  ruleSofter: "#cccccc",
  overlay: "rgba(255,255,255,0)",
};

function makeStyles(variant: "color" | "print") {
  const C = variant === "print" ? COLORS_PRINT : COLORS_COLOR;
  return StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.text,
    backgroundColor: C.pageBg,
  },
  cover: { padding: 0, fontFamily: "Helvetica", color: C.text, backgroundColor: C.pageBg },
  coverImageWrap: { height: 280, backgroundColor: C.pageBg, position: "relative" },
  coverImage: { width: "100%", height: "100%", objectFit: "cover" },
  coverOverlay: { position: "absolute", inset: 0, backgroundColor: C.overlay },
  coverImageFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    backgroundColor: C.pageBg,
    opacity: 0.6,
  },
  coverHeroNoPhoto: {
    height: 200,
    backgroundColor: C.pageBg,
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
    color: C.accent,
  },
  coverHeroTitle: {
    fontSize: 30,
    fontWeight: 700,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: -0.5,
    color: C.text,
  },
  coverHeroSubtitle: {
    fontSize: 10,
    marginTop: 10,
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  coverHeroRule: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 0,
    height: 2,
    backgroundColor: C.accent,
  },
  coverContent: { padding: 36 },
  brand: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.accent,
  },
  buyerTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  buyerAddr: { fontSize: 12, marginTop: 6, color: C.muted },
  noteBox: {
    marginTop: 22,
    padding: 16,
    borderRadius: 8,
    backgroundColor: C.cardBg,
    border: `1 solid ${C.cardBorder}`,
  },
  noteEyebrow: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: C.accent,
    textTransform: "uppercase",
  },
  note: { fontSize: 10, marginTop: 6, lineHeight: 1.5 },
  realtorCard: {
    marginTop: 22,
    padding: 14,
    borderRadius: 10,
    backgroundColor: C.cardBg,
    border: `1 solid ${C.cardBorder}`,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  realtorEyebrow: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: C.accent,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headshot: { width: 56, height: 56, borderRadius: 28, objectFit: "cover" },
  realtorBlock: { flex: 1 },
  realtorName: { fontSize: 14, fontWeight: 700, textTransform: "uppercase" },
  realtorBrokerage: { fontSize: 9, color: C.muted, marginTop: 2 },
  realtorMeta: { fontSize: 9, color: C.muted, marginTop: 6 },
  brokerageLogo: { maxWidth: 80, maxHeight: 40, objectFit: "contain" },
  qrBlock: { alignItems: "center", marginTop: 18 },
  qr: { width: 78, height: 78 },
  qrCaption: { fontSize: 7, textAlign: "center", color: C.muted, marginTop: 2, maxWidth: 90 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: `1 solid ${C.ruleSoft}`,
  },
  pageTitle: { fontSize: 18, fontWeight: 700, textTransform: "uppercase" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: `1 solid ${C.ruleSofter}`,
    paddingBottom: 3,
  },
  featuredRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  featuredCard: {
    flex: 1,
    border: `1 solid ${C.cardBorder}`,
    backgroundColor: C.cardBg,
    padding: 10,
    borderRadius: 6,
  },
  bizName: { fontSize: 10, fontWeight: 700 },
  bizMeta: { fontSize: 8, color: C.muted, marginTop: 1 },
  coupon: { fontSize: 8, color: C.accent, marginTop: 3, fontWeight: 700 },
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
    color: C.muted,
    textAlign: "center",
  },
  thankYouPage: {
    padding: 36,
    backgroundColor: C.thankBg,
    color: C.thankText,
    fontFamily: "Helvetica",
  },
  thankBig: { fontSize: 32, fontWeight: 700, textTransform: "uppercase", marginTop: 24 },
  thankBody: {
    fontSize: 11,
    marginTop: 12,
    color: C.thankBodyMuted,
    lineHeight: 1.6,
    maxWidth: 380,
  },
  thankAgent: { marginTop: 28, fontSize: 11, color: C.thankAgentMuted },
  thankCta: {
    marginTop: 14,
    padding: 12,
    border: `1 solid ${C.thankCtaBorder}`,
    borderRadius: 8,
  },
  });
}

type Styles = ReturnType<typeof makeStyles>;


export type HandbookDocumentProps = {
  packet: Packet;
  realtor: HandbookRealtor | null;
  town: Town | null;
  categories: Category[];
  businesses: Business[];
  recommended?: HandbookRecommendation[];
  qrDataUrl: string;
  liveUrl: string;
  variant?: "color" | "print";
};

export function HandbookDocument({
  packet,
  realtor,
  town,
  categories,
  businesses,
  recommended,
  qrDataUrl,
  liveUrl,
  variant = "color",
}: HandbookDocumentProps) {
  const styles = makeStyles(variant);
  const accent = variant === "print" ? "#000000" : "#FF6B00";
  // Featured: prefer scored recommendations from the recommender; fall back
  // to sponsor-tier-only for older callers that haven't passed `recommended`.
  let featured: Business[];
  if (recommended && recommended.length > 0) {
    const byId = new Map(businesses.map((b) => [b.id, b]));
    featured = recommended
      .map((r) => byId.get(r.business_id))
      .filter((b): b is Business => !!b)
      .slice(0, 4);
  } else {
    featured = businesses
      .filter((b) => b.sponsor_tier !== "none")
      .sort(
        (a, b) =>
          tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
          a.featured_order - b.featured_order,
      )
      .slice(0, 4);
  }

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

  const realtorContact = [realtor?.email_public, realtor?.phone].filter(Boolean).join("  ·  ");
  const hasHeadshot = !!realtor?.headshot_url;
  const hasLogo = !!realtor?.brokerage_logo_url;

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

          {/* Branded realtor card — headshot, name, brokerage, contact, logo */}
          {realtor && (
            <View style={styles.realtorCard}>
              {hasHeadshot && <Image src={realtor.headshot_url!} style={styles.headshot} />}
              <View style={styles.realtorBlock}>
                <Text style={styles.realtorEyebrow}>// Your guide</Text>
                <Text style={styles.realtorName}>{realtor.full_name ?? ""}</Text>
                {realtor.brokerage_name && (
                  <Text style={styles.realtorBrokerage}>{realtor.brokerage_name}</Text>
                )}
                {realtorContact && <Text style={styles.realtorMeta}>{realtorContact}</Text>}
              </View>
              {hasLogo && (
                <Image src={realtor.brokerage_logo_url!} style={styles.brokerageLogo} />
              )}
            </View>
          )}

          {qrDataUrl ? (
            <View style={styles.qrBlock}>
              <Image src={qrDataUrl} style={styles.qr} />
              <Text style={styles.qrCaption}>Scan for live page</Text>
            </View>
          ) : null}
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
              <Text style={styles.sectionTitle}>Picked for you</Text>
              <View style={styles.featuredRow}>
                {featured.slice(0, 2).map((b) => (
                  <FeaturedCardPdf key={b.id} b={b} styles={styles} />
                ))}
              </View>
              {featured.length > 2 && (
                <View style={styles.featuredRow}>
                  {featured.slice(2, 4).map((b) => (
                    <FeaturedCardPdf key={b.id} b={b} styles={styles} />
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.sectionTitle}>Local directory</Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              {left.map((c) => (
                <CategoryPdf key={c.id} category={c} list={byCategory.get(c.id) ?? []} styles={styles} />
              ))}
            </View>
            <View style={styles.col}>
              {right.map((c) => (
                <CategoryPdf key={c.id} category={c} list={byCategory.get(c.id) ?? []} styles={styles} />
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
              color: accent,
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

function FeaturedCardPdf({ b, styles }: { b: Business; styles: Styles }) {
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

function CategoryPdf({ category, list, styles }: { category: Category; list: Business[]; styles: Styles }) {
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
