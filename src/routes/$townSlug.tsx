import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Sparkles,
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
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchTownPage,
  tierPriority,
  type Business,
  type Category,
  type TownPage,
} from "@/lib/towns";
import { townHeroImage } from "@/lib/logo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionDivider } from "@/components/section-divider";
import { BusinessCard } from "@/components/business-card";

// Wisconsin landscape palette mapped to category chips/badges.
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
  component: TownRoute,
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

function TownRoute() {
  const { townSlug } = Route.useParams();
  const q = useQuery<TownPage | null>({
    queryKey: ["town", townSlug],
    queryFn: () => fetchTownPage(townSlug),
  });

  if (q.isLoading) return <CenterMsg>Loading…</CenterMsg>;
  if (q.isError) return <CenterMsg>Couldn't load this town. Try again.</CenterMsg>;
  if (!q.data) throw notFound();
  return <TownView data={q.data} />;
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function TownView({ data }: { data: TownPage }) {
  const { town, categories, businesses } = data;

  // Group sponsored businesses BY category (no auto-care next to bistros).
  const featuredByCategory = useMemo(() => {
    const sponsored = businesses.filter((b) => b.sponsor_tier !== "none");
    const map = new Map<string, Business[]>();
    for (const b of sponsored) {
      const arr = map.get(b.category_id) ?? [];
      arr.push(b);
      map.set(b.category_id, arr);
    }
    for (const [, arr] of map) {
      arr.sort(
        (a, b) =>
          tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
          a.featured_order - b.featured_order,
      );
    }
    return categories
      .map((c, idx) => ({ category: c, idx, list: map.get(c.id) ?? [] }))
      .filter((g) => g.list.length > 0);
  }, [businesses, categories]);

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
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO --------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 pt-10 pb-12 md:grid-cols-[minmax(0,360px)_1fr] md:gap-12 md:pt-14">
        {(() => {
          const hero = townHeroImage(town.slug, town.name);
          return (
            <div
              className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-soft)]"
              style={hero.fit === "contain" ? { background: "var(--card)" } : undefined}
            >
              <span className="absolute left-4 top-4 z-10 rounded-full bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/70 backdrop-blur">
                // {town.county} County
              </span>
              <img
                src={hero.src}
                alt={`${town.name}, Wisconsin`}
                className={
                  "h-[420px] w-full md:h-full " +
                  (hero.fit === "contain" ? "object-contain p-10" : "object-cover")
                }
              />
            </div>
          );
        })()}

        <div className="flex flex-col justify-center">
          <Link
            to="/"
            className="mb-6 inline-flex w-fit items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All towns
          </Link>
          <SectionDivider label={`${town.state} · Welcome`} className="mb-5" />
          <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl">
            Welcome to
            <br />
            <span className="text-primary">{town.name}.</span>
          </h1>
          {town.hero_blurb && (
            <p className="mt-5 max-w-xl text-base text-foreground/70">
              {town.hero_blurb}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[var(--shadow-cta)] hover:bg-primary/90"
            >
              <a href={`/api/pdf/${town.slug}`} target="_blank" rel="noreferrer">
                <Download className="mr-1 h-5 w-5" />
                Download Welcome PDF
              </a>
            </Button>
            {qrUrl && (
              <div className="flex items-center gap-3 rounded-full border border-foreground/15 bg-background py-1.5 pl-2 pr-4">
                <img
                  src={qrUrl}
                  alt="QR to this page"
                  className="h-10 w-10 rounded-full border border-border bg-white p-0.5"
                />
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/70">
                  Scan to share
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* STICKY CATEGORY NAV ----------------------------------------- */}
      <CategoryNav categories={categories} byCategory={byCategory} />

      {/* FEATURED — GROUPED BY CATEGORY ------------------------------ */}
      {featuredByCategory.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-cta)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <SectionDivider label="Featured locals" className="flex-1" />
          </div>

          <div className="space-y-10">
            {featuredByCategory.map(({ category, idx, list }) => {
              const p = paletteFor(idx);
              const Icon = iconFor(category);
              return (
                <div key={category.id}>
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ background: p.bg, color: p.fg }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      Featured {category.name}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {list.length} sponsor{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {list.map((b) => (
                      <div key={b.id} className="snap-start">
                        <BusinessCard b={b} category={category} variant="featured" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CATEGORY SECTIONS ------------------------------------------- */}
      <section className="mx-auto max-w-6xl space-y-16 px-5 py-16">
        {categories.map((c, idx) => {
          const list = byCategory.get(c.id) ?? [];
          if (list.length === 0) return null;
          return (
            <CategorySection
              key={c.id}
              category={c}
              businesses={list}
              palette={paletteFor(idx)}
            />
          );
        })}
      </section>

      {/* WRONG TOWN PROMPT ------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-12 text-center text-sm text-muted-foreground">
        Not the right town?{" "}
        <Link to="/" className="font-semibold text-primary underline">
          Pick another
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}

function CategoryNav({
  categories,
  byCategory,
}: {
  categories: Category[];
  byCategory: Map<string, Business[]>;
}) {
  const visible = categories.filter((c) => (byCategory.get(c.id) ?? []).length > 0);
  const [active, setActive] = useState<string | null>(
    visible[0] ? `cat-${visible[0].id}` : null,
  );
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    visible.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visible.map((c) => c.id).join(",")]);

  useEffect(() => {
    if (!active || !scrollerRef.current) return;
    const chip = scrollerRef.current.querySelector<HTMLElement>(
      `[data-chip="${active}"]`,
    );
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  if (!visible.length) return null;

  return (
    <div className="sticky top-[73px] z-30 border-y border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5">
        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((c, idx) => {
            const Icon = iconFor(c);
            const p = paletteFor(idx);
            const isActive = active === `cat-${c.id}`;
            const count = byCategory.get(c.id)?.length ?? 0;
            return (
              <button
                key={c.id}
                data-chip={`cat-${c.id}`}
                onClick={() => {
                  document
                    .getElementById(`cat-${c.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="group inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-medium transition-all duration-300 ease-out"
                style={{
                  background: isActive ? "var(--background)" : "var(--card)",
                  color: "var(--wi-ink)",
                  borderColor: isActive ? "var(--primary)" : p.bg,
                  transform: isActive
                    ? "translateY(-2px) scale(1.04)"
                    : "translateY(0) scale(1)",
                  boxShadow: isActive
                    ? "0 0 0 4px color-mix(in oklab, var(--primary) 18%, transparent)"
                    : "0 1px 0 0 color-mix(in oklab, var(--wi-ink) 10%, transparent)",
                }}
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300 group-hover:[animation:wi-wiggle_0.5s_ease-in-out]"
                  style={{ background: p.bg, color: p.fg }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{c.name}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{
                    background: "color-mix(in oklab, var(--wi-ink) 8%, transparent)",
                    color: "var(--wi-ink)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  businesses,
  palette,
}: {
  category: Category;
  businesses: Business[];
  palette: { bg: string; fg: string };
}) {
  const Icon = iconFor(category);
  const sorted = [...businesses].sort(
    (a, b) =>
      tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
      a.name.localeCompare(b.name),
  );
  return (
    <div id={`cat-${category.id}`} className="scroll-mt-40">
      <div className="mb-6 flex items-center gap-4">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-[var(--shadow-soft)]"
          style={{
            background: palette.bg,
            color: palette.fg,
            transform: "rotate(-4deg)",
          }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            // {category.slug}
          </p>
          <h2 className="font-display text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
            {category.name}
          </h2>
        </div>
        <span
          className="hidden h-1 flex-1 rounded-full sm:block"
          style={{
            background: `color-mix(in oklab, ${palette.bg} 35%, transparent)`,
          }}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((b) => (
          <BusinessCard key={b.id} b={b} category={category} />
        ))}
      </div>
    </div>
  );
}
