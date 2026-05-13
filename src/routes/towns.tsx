import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listTowns } from "@/lib/towns";
import { townHeroImage } from "@/lib/logo";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionDivider } from "@/components/section-divider";

export const Route = createFileRoute("/towns")({
  head: () => ({
    meta: [
      { title: "Wisconsin Towns Directory — Hearth Handbook" },
      {
        name: "description",
        content:
          "Browse every Wisconsin town in the Hearth Handbook directory. Start in Ozaukee County and find local restaurants, shops, parks and trails.",
      },
      { property: "og:title", content: "Wisconsin Towns Directory — Hearth Handbook" },
      {
        property: "og:description",
        content: "Browse every Wisconsin town in the Hearth Handbook directory.",
      },
      { property: "og:url", content: "https://hearthhandbook.com/towns" },
    ],
    links: [{ rel: "canonical", href: "https://hearthhandbook.com/towns" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Wisconsin Towns Directory",
          url: "https://hearthhandbook.com/towns",
          description: "Browse every Wisconsin town in the Hearth Handbook directory.",
          isPartOf: { "@type": "WebSite", name: "Hearth Handbook", url: "https://hearthhandbook.com/" },
        }),
      },
    ],
  }),
  component: TownsPage,
});

const TAGLINES: Record<string, string> = {
  grafton: "Riverside village built around Bridge Street's brick storefronts.",
  cedarburg: "Historic downtown, covered bridge, year-round festivals.",
  mequon: "Leafy lakeshore neighborhoods and farm-to-table favorites.",
  "port-washington": "Lake Michigan harbor town with the iconic 1860 lighthouse.",
  thiensville: "Compact, walkable village along the Milwaukee River.",
  saukville: "Riverside village on the Milwaukee River with classic small-town charm.",
  fredonia: "Quiet northern Ozaukee community surrounded by farms and forests.",
  belgium: "Lake Michigan village with deep heritage and wide-open countryside.",
};

const COUNTY_COLORS: Record<string, string> = {
  Ozaukee: "var(--wi-lake)",
  Milwaukee: "var(--wi-cranberry)",
  Washington: "var(--wi-pine)",
};

type FullTown = {
  slug: string;
  name: string;
  county: string;
  zip_codes: string[];
};

async function fetchTownsFull(): Promise<FullTown[]> {
  const { data, error } = await supabase
    .from("towns")
    .select("slug,name,county,zip_codes")
    .order("name");
  if (error) throw error;
  return (data ?? []) as FullTown[];
}

function TownsPage() {
  const [query, setQuery] = useState("");
  const [activeCounty, setActiveCounty] = useState<string | null>(null);
  // Prefetch via cached query to share with home page
  void useQuery({ queryKey: ["towns"], queryFn: listTowns });
  const townsQ = useQuery({ queryKey: ["towns-full"], queryFn: fetchTownsFull });

  const counties = useMemo(() => {
    const set = new Set<string>();
    (townsQ.data ?? []).forEach((t) => set.add(t.county));
    return Array.from(set).sort();
  }, [townsQ.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (townsQ.data ?? []).filter((t) => {
      if (activeCounty && t.county !== activeCounty) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.county.toLowerCase().includes(q) ||
        t.zip_codes.some((z) => z.includes(q))
      );
    });
  }, [townsQ.data, query, activeCounty]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-10">
        <SectionDivider label="Wisconsin towns directory" className="mb-5" />
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <h1 className="font-display max-w-2xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Find your <span className="text-primary">town.</span>
          </h1>
          <p className="max-w-md text-base text-foreground/70">
            Every Hearth Handbook guide is hand-curated with local restaurants,
            shops, services, parks and coupons. Start with Ozaukee County —
            more towns are rolling out across Wisconsin.
          </p>
        </div>

        {/* Search + filter */}
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-md">
            <label htmlFor="towns-search" className="sr-only">Search towns</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
            <Input
              id="towns-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search town, county, or ZIP"
              aria-label="Search town, county, or ZIP"
              className="h-12 rounded-full border-foreground/15 bg-card pl-11 pr-5"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCounty(null)}
              className="inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all"
              style={{
                background: !activeCounty ? "var(--foreground)" : "var(--card)",
                color: !activeCounty ? "var(--background)" : "var(--foreground)",
                borderColor: !activeCounty ? "var(--foreground)" : "var(--border)",
              }}
            >
              All
            </button>
            {counties.map((c) => {
              const active = activeCounty === c;
              const color = COUNTY_COLORS[c] ?? "var(--wi-sunset)";
              return (
                <button
                  key={c}
                  onClick={() => setActiveCounty(active ? null : c)}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all"
                  style={{
                    background: active ? color : "var(--card)",
                    color: active ? "white" : "var(--foreground)",
                    borderColor: color,
                  }}
                >
                  {c} County
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        {townsQ.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[360px] animate-pulse rounded-3xl border border-border bg-card"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-foreground/70">
              No towns match that search yet. Try a different ZIP or county.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => {
              const hero = townHeroImage(t.slug, t.name);
              const tagline = TAGLINES[t.slug] ?? "A Wisconsin town worth discovering.";
              const color = COUNTY_COLORS[t.county] ?? "var(--wi-sunset)";
              return (
                <Link
                  key={t.slug}
                  to="/$townSlug"
                  params={{ townSlug: t.slug }}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)]"
                >
                  <div
                    className="relative h-48 overflow-hidden"
                    style={hero.fit === "contain" ? { background: "var(--card)" } : undefined}
                  >
                    <img
                      src={hero.src}
                      alt={`Photo of ${t.name}, ${t.county} County, Wisconsin`}
                      loading="lazy"
                      className={
                        "h-full w-full transition-transform duration-700 group-hover:scale-[1.06] " +
                        (hero.fit === "contain" ? "object-contain p-8" : "object-cover")
                      }
                    />
                    <span
                      className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                      style={{ background: color }}
                    >
                      <MapPin className="h-3 w-3" /> {t.county}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight">
                      {t.name}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground/65">
                      {tagline}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-5">
                      <span className="text-[11px] uppercase tracking-wider text-foreground/45">
                        {t.zip_codes.join(" · ")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5">
                        Visit town <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
