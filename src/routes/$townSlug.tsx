import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  MapPin,
  Phone,
  Sparkles,
  Tag,
  Utensils,
  Coffee,
  ShoppingBag,
  Wrench,
  Trees,
  Music,
  Heart,
  GraduationCap,
  Building2,
  Hammer,
  Sparkle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchTownPage,
  tierPriority,
  type Business,
  type Category,
  type TownPage,
} from "@/lib/towns";

// Wisconsin landscape palette mapped to category chips.
const WI_PALETTE = [
  { bg: "var(--wi-lake)", fg: "white" },
  { bg: "var(--wi-cranberry)", fg: "white" },
  { bg: "var(--wi-pine)", fg: "white" },
  { bg: "var(--wi-cheddar)", fg: "var(--wi-ink)" },
  { bg: "var(--wi-sunset)", fg: "var(--wi-ink)" },
  { bg: "var(--wi-barn)", fg: "white" },
  { bg: "var(--wi-sky)", fg: "var(--wi-ink)" },
  { bg: "var(--wi-corn)", fg: "var(--wi-ink)" },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils, restaurants: Utensils, dining: Utensils,
  coffee: Coffee, cafes: Coffee,
  shopping: ShoppingBag, shops: ShoppingBag, retail: ShoppingBag,
  services: Wrench,
  outdoors: Trees, parks: Trees,
  nightlife: Music, entertainment: Music,
  health: Heart, wellness: Heart,
  education: GraduationCap, schools: GraduationCap,
  government: Building2, civic: Building2,
  home: Hammer, trades: Hammer,
};

const iconFor = (c: Category): LucideIcon => CATEGORY_ICONS[c.slug] ?? Sparkle;
const paletteFor = (i: number) => WI_PALETTE[i % WI_PALETTE.length];

export const Route = createFileRoute("/$townSlug")({
  component: TownPage,
  head: ({ params }) => {
    const name = params.townSlug
      .split("-")
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(" ");
    const title = `Welcome to ${name}, WI — TownWelcome`;
    const desc = `Restaurants, coffee, shops, services, and local favorites in ${name}, Wisconsin.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
});

function TownPage() {
  const { townSlug } = Route.useParams();
  const q = useQuery<TownPage | null>({
    queryKey: ["town", townSlug],
    queryFn: () => fetchTownPage(townSlug),
  });

  if (q.isLoading) return <CenterMsg>Loading…</CenterMsg>;
  if (q.isError) return <CenterMsg>Couldn't load this town. Try again.</CenterMsg>;
  if (!q.data) {
    throw notFound();
  }
  return <TownView data={q.data} />;
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      {children}
    </div>
  );
}

function TownView({ data }: { data: TownPage }) {
  const { town, categories, businesses } = data;

  const featured = useMemo(
    () =>
      businesses
        .filter((b) => b.sponsor_tier !== "none")
        .sort(
          (a, b) =>
            tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
            a.featured_order - b.featured_order,
        )
        .slice(0, 4),
    [businesses],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, Business[]>();
    for (const b of businesses) {
      const arr = map.get(b.category_id) ?? [];
      arr.push(b);
      map.set(b.category_id, arr);
    }
    return map;
  }, [businesses]);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const liveUrl = `${window.location.origin}/${town.slug}`;
    import("qrcode").then((QR) =>
      QR.toDataURL(liveUrl, { margin: 1, width: 96 }).then(setQrUrl),
    );
  }, [town.slug]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> All towns
          </Link>
          <div className="flex-1 text-center font-semibold truncate">
            {town.name}, {town.state}
          </div>
          <a href={`/api/pdf/${town.slug}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </a>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 pt-10 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/70">
              {town.county} County, {town.state}
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
              Welcome to {town.name}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              {town.hero_blurb}
            </p>
          </div>
          {qrUrl && (
            <div className="hidden sm:flex flex-col items-center text-[10px] text-muted-foreground">
              <img src={qrUrl} alt="QR to this page" className="rounded-md border bg-white p-1" />
              <span className="mt-1">Scan to share</span>
            </div>
          )}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Featured locals</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((b) => (
              <FeaturedCard key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 py-6 space-y-10">
        {categories.map((c) => {
          const list = byCategory.get(c.id) ?? [];
          if (list.length === 0) return null;
          return <CategorySection key={c.id} category={c} businesses={list} />;
        })}
      </section>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        Not the right town?{" "}
        <Link to="/" className="text-primary underline">
          Pick another
        </Link>
      </footer>
    </div>
  );
}

function FeaturedCard({ b }: { b: Business }) {
  return (
    <Card className="overflow-hidden border-primary/20 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 bg-primary/10 text-primary border-primary/20">
              Featured
            </Badge>
            <h3 className="font-semibold text-lg leading-tight">{b.name}</h3>
            {b.subcategory && (
              <p className="text-xs text-muted-foreground">{b.subcategory}</p>
            )}
          </div>
          {b.logo_url && (
            <img
              src={b.logo_url}
              alt={b.name}
              className="h-12 w-12 rounded-lg object-cover bg-muted"
            />
          )}
        </div>
        {b.description && (
          <p className="text-sm mt-3 text-foreground/80">{b.description}</p>
        )}
        {b.coupon_text && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent/10 text-accent-foreground border border-accent/30 px-3 py-1.5 text-sm">
            <Tag className="h-4 w-4 text-accent" />
            <span className="text-accent">{b.coupon_text}</span>
          </div>
        )}
        <BusinessLinks b={b} />
      </CardContent>
    </Card>
  );
}

function CategorySection({
  category,
  businesses,
}: {
  category: Category;
  businesses: Business[];
}) {
  const sorted = [...businesses].sort(
    (a, b) =>
      tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
      a.name.localeCompare(b.name),
  );
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">{category.name}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium leading-tight">{b.name}</h3>
                  {b.subcategory && (
                    <p className="text-xs text-muted-foreground">
                      {b.subcategory}
                    </p>
                  )}
                </div>
                {b.sponsor_tier !== "none" && (
                  <Badge variant="secondary" className="text-[10px]">
                    Sponsor
                  </Badge>
                )}
              </div>
              {b.description && (
                <p className="text-sm mt-2 text-foreground/80 line-clamp-2">
                  {b.description}
                </p>
              )}
              {b.coupon_text && (
                <p className="mt-2 text-xs text-accent">🎟 {b.coupon_text}</p>
              )}
              <BusinessLinks b={b} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BusinessLinks({ b }: { b: Business }) {
  const items: React.ReactNode[] = [];
  if (b.phone)
    items.push(
      <a
        key="phone"
        href={`tel:${b.phone}`}
        className="inline-flex items-center gap-1 hover:text-primary"
      >
        <Phone className="h-3.5 w-3.5" /> {b.phone}
      </a>,
    );
  if (b.address)
    items.push(
      <a
        key="addr"
        href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 hover:text-primary"
      >
        <MapPin className="h-3.5 w-3.5" /> Map
      </a>,
    );
  if (b.website)
    items.push(
      <a
        key="web"
        href={b.website}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 hover:text-primary"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Website
      </a>,
    );
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items}
    </div>
  );
}
