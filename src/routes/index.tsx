import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Loader2,
  Search,
  ArrowRight,
  Bird,
  Utensils,
  ShoppingBag,
  Trees,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTowns, resolveTown } from "@/lib/towns";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionDivider } from "@/components/section-divider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearth Handbook — Your local Wisconsin town guide" },
      {
        name: "description",
        content:
          "Discover restaurants, shops, services, and local favorites in your Wisconsin town. Auto-detects your location.",
      },
      { property: "og:title", content: "Hearth Handbook — Your local Wisconsin town guide" },
      {
        property: "og:description",
        content:
          "Discover restaurants, shops, services, and local favorites in your Wisconsin town.",
      },
      { property: "og:url", content: "https://hearthhandbook.com/" },
    ],
    links: [{ rel: "canonical", href: "https://hearthhandbook.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Hearth Handbook",
              url: "https://hearthhandbook.com/",
              description:
                "A digital welcome mat for Wisconsin towns — hand-curated local restaurants, shops, services, parks, and coupons.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://hearthhandbook.com/towns?query={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "Organization",
              name: "Hearth Handbook",
              url: "https://hearthhandbook.com/",
              email: "info@hearthhandbook.com",
              areaServed: { "@type": "AdministrativeArea", name: "Wisconsin, USA" },
            },
          ],
        }),
      },
    ],
  }),
  component: Home,
});

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80";

const SHOWCASES = [
  {
    label: "Eat Local",
    title: "BISTROS, DINERS & BREWERIES",
    cta: "Find a table",
    img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80",
    icon: Utensils,
  },
  {
    label: "Shop Main Street",
    title: "BOUTIQUES & MAKERS",
    cta: "Browse shops",
    img: "https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=1000&q=80",
    icon: ShoppingBag,
  },
  {
    label: "Explore Outdoors",
    title: "PARKS, LAKES & TRAILS",
    cta: "Get outside",
    img: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80",
    icon: Trees,
  },
];

function Home() {
  const navigate = useNavigate();
  const [locating, setLocating] = useState(false);
  const [zip, setZip] = useState("");
  const [manualSlug, setManualSlug] = useState("");

  const towns = useQuery({ queryKey: ["towns"], queryFn: listTowns });

  const goTo = (slug: string) =>
    navigate({ to: "/$townSlug", params: { townSlug: slug } });

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // 1) Try direct lat/lng nearest-town RPC
          let match = await resolveTown({ lat, lng });
          // 2) Fallback to BigDataCloud reverse geocode → ZIP
          if (!match) {
            try {
              const r = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
              );
              const j = await r.json();
              const zipFromBDC: string | undefined = j?.postcode;
              if (zipFromBDC && /^\d{5}/.test(zipFromBDC)) {
                match = await resolveTown({ zip: zipFromBDC.slice(0, 5) });
              }
            } catch {
              /* ignore */
            }
          }
          if (match) goTo(match.slug);
          else {
            toast.message("We couldn't find a Hearth Handbook page near you yet.", {
              description: "Browse all towns or enter a ZIP below.",
            });
            setLocating(false);
          }
        } catch (e) {
          console.error(e);
          toast.error("Something went wrong locating your town.");
          setLocating(false);
        }
      },
      (err) => {
        console.warn(err);
        toast.error("Location permission denied.", {
          description: "Use the dropdown or ZIP search below.",
        });
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const findByZip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      toast.error("Please enter a 5-digit ZIP code.");
      return;
    }
    const match = await resolveTown({ zip });
    if (match) goTo(match.slug);
    else toast.error("No Hearth Handbook page for that ZIP yet.");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO --------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 pt-10 pb-16 md:grid-cols-[minmax(0,360px)_1fr] md:gap-12 md:pt-14">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-secondary shadow-[var(--shadow-soft)]">
          <span className="absolute left-4 top-4 z-10 rounded-full bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/70 backdrop-blur">
            // Welcome
          </span>
          <img
            src={HERO_IMAGE}
            alt="Aerial view of a Wisconsin town in golden afternoon light"
            width={1200}
            height={840}
            fetchPriority="high"
            decoding="async"
            className="h-[420px] w-full object-cover md:h-full"
          />
        </div>

        <div className="flex flex-col justify-center">
          <SectionDivider label="Hearth Handbook / WI" className="mb-6" />
          <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl">
            Discover your town,
            <br />
            <span className="relative inline-block">
              one local
              <Bird className="absolute -right-12 -top-2 h-9 w-9 text-[color:var(--wi-cheddar)] animate-[wi-wiggle_2.4s_ease-in-out_infinite]" />
            </span>{" "}
            at a time.
          </h1>
          <p className="mt-5 max-w-md text-base text-foreground/70">
            Restaurants, coffee, shops, parks, services and coupons — curated
            for every Wisconsin town. Tap and we'll bring your local guide
            right to you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={useMyLocation}
              disabled={locating}
              className="h-14 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[var(--shadow-cta)] hover:bg-primary/90"
            >
              {locating ? (
                <Loader2 className="mr-1 h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="mr-1 h-5 w-5" />
              )}
              {locating ? "Finding your town…" : "Use my location"}
            </Button>
            <Link
              to="/towns"
              className="inline-flex h-14 items-center gap-2 rounded-full border border-foreground/15 bg-background px-6 text-base font-medium text-foreground transition-colors hover:border-foreground/40"
            >
              Browse towns <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORY SHOWCASE ------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <SectionDivider label="What's around the corner" className="mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          {SHOWCASES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                to="/towns"
                className="group relative block overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-soft)]"
              >
                <img
                  src={s.img}
                  alt={`${s.label} category preview`}
                  loading="lazy"
                  className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-background">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-background/80">
                    <Icon className="h-4 w-4 text-primary" /> {s.label}
                  </div>
                  <h2 className="font-display mt-2 text-2xl font-extrabold leading-tight">
                    {s.title}
                  </h2>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
                    {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TOWN PICKER -------------------------------------------------- */}
      <section id="towns" className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] md:grid-cols-[1.1fr_1fr] md:p-12">
          <div>
            <SectionDivider label="Find your town" className="mb-5" />
            <h2 className="font-display text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Pick a town —<br />
              we'll roll out the welcome mat.
            </h2>
            <p className="mt-4 max-w-md text-foreground/70">
              We're starting in Ozaukee County (Grafton, Cedarburg, Mequon,
              Port Washington, Thiensville, Saukville, Fredonia, Belgium).
              More Wisconsin towns coming soon.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="eyebrow mb-2 block">Browse</label>
              <Select
                value={manualSlug}
                onValueChange={(v) => {
                  setManualSlug(v);
                  goTo(v);
                }}
              >
                <SelectTrigger className="h-12 rounded-full border-foreground/15 bg-background px-5">
                  <SelectValue placeholder="Choose a town" />
                </SelectTrigger>
                <SelectContent>
                  {(towns.data ?? []).map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="zip-input" className="eyebrow mb-2 block">Or enter ZIP</label>
              <form
                onSubmit={findByZip}
                suppressHydrationWarning
                className="flex gap-2"
              >
                <Input
                  id="zip-input"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="53024"
                  aria-label="ZIP code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                  className="h-12 rounded-full border-foreground/15 bg-background px-5"
                  suppressHydrationWarning
                />
                <Button
                  type="submit"
                  aria-label="Find town by ZIP code"
                  className="h-12 rounded-full bg-foreground px-5 text-background hover:bg-foreground/90"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section id="sponsor" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="overflow-hidden rounded-3xl bg-foreground p-10 text-background md:p-14">
          <SectionDivider label="For local businesses" className="mb-5 [&_span]:text-background/60 [&_span:first-child]:text-background" />
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <h2 className="font-display max-w-xl text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Be the first business locals see
              when they move to town.
            </h2>
            <a
              href="mailto:info@hearthhandbook.com"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Get listed <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

