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

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1410", backgroundColor: "#F9F2E8" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "1 solid #e7d9c5" },
  brand: { fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#1a1410", textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a1410", textTransform: "uppercase" },
  blurb: { fontSize: 9, marginTop: 4, color: "#6a5a48", maxWidth: 380 },
  qr: { width: 72, height: 72 },
  qrCaption: { fontSize: 7, textAlign: "center", color: "#6a5a48", marginTop: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 10,
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
    padding: 8,
    borderRadius: 6,
  },
  bizName: { fontSize: 10, fontWeight: 700, color: "#1a1410" },
  bizMeta: { fontSize: 8, color: "#6a5a48", marginTop: 1 },
  coupon: { fontSize: 8, color: "#FF6B00", marginTop: 2, fontWeight: 700 },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  catTitle: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3, color: "#1a1410", textTransform: "uppercase", letterSpacing: 0.8 },
  bizRow: { marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#6a5a48",
    textAlign: "center",
  },
});

export const Route = createFileRoute("/api/pdf/$townSlug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = params.townSlug;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: town } = await supabaseAdmin
          .from("towns")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (!town) return new Response("Not found", { status: 404 });

        const [{ data: categories }, { data: businesses }] = await Promise.all([
          supabaseAdmin.from("categories").select("*").order("display_order"),
          supabaseAdmin.from("businesses").select("*").eq("town_id", (town as Town).id),
        ]);

        const origin = new URL(request.url).origin;
        const liveUrl = `${origin}/${slug}`;
        const qrDataUrl = await QRCode.toDataURL(liveUrl, { margin: 0, width: 280 });

        const doc = createElement(TownPdf, {
          town: town as Town,
          categories: (categories ?? []) as Category[],
          businesses: (businesses ?? []) as Business[],
          qrDataUrl,
          liveUrl,
        });

        const stream = await renderToStream(doc as any);

        return new Response(stream as any, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="townwelcome-${slug}.pdf"`,
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});

function TownPdf({
  town,
  categories,
  businesses,
  qrDataUrl,
  liveUrl,
}: {
  town: Town;
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
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>TownWelcome · {town.state}</Text>
            <Text style={styles.title}>Welcome to {town.name}</Text>
            <Text style={styles.blurb}>
              {town.county} County, {town.state}
              {town.hero_blurb ? ` · ${town.hero_blurb}` : ""}
            </Text>
          </View>
          <View>
            <Image src={qrDataUrl} style={styles.qr} />
            <Text style={styles.qrCaption}>Scan for live page</Text>
          </View>
        </View>

        {featured.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Featured locals</Text>
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

        <Text style={styles.footer}>
          TownWelcome · {liveUrl} · Scan the QR for the live, up-to-date page
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
      {b.coupon_text && <Text style={styles.coupon}>🎟 {b.coupon_text}</Text>}
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
          {b.coupon_text && <Text style={styles.coupon}>🎟 {b.coupon_text}</Text>}
        </View>
      ))}
    </View>
  );
}
