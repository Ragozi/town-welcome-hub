import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Sparkles, Heart, Map, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionDivider } from "@/components/section-divider";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Hearth Handbook — A digital welcome mat for Wisconsin" },
      {
        name: "description",
        content:
          "Hearth Handbook is a digital welcome mat for Wisconsin towns — meet the locals, grab a coupon, and feel at home.",
      },
      {
        property: "og:title",
        content: "About Hearth Handbook — A digital welcome mat for Wisconsin",
      },
      {
        property: "og:description",
        content:
          "Meet the team and mission behind Hearth Handbook — Wisconsin's hand-curated local guide.",
      },
    ],
  }),
  component: AboutPage,
});

const STEPS = [
  {
    icon: MapPin,
    title: "Find your town",
    body: "Tap “Use my location”, enter a ZIP, or browse the Wisconsin towns directory.",
  },
  {
    icon: Sparkles,
    title: "Meet the locals",
    body: "Hand-curated restaurants, shops, services, parks and trails — no algorithm required.",
  },
  {
    icon: Heart,
    title: "Grab a coupon",
    body: "Featured local sponsors share exclusive welcome offers you can save or print.",
  },
];

const ROADMAP = [
  { county: "Ozaukee", color: "var(--wi-lake)", status: "Live", towns: "Grafton · Cedarburg · Mequon · Port Washington · Thiensville · Saukville · Fredonia · Belgium" },
  { county: "Washington", color: "var(--wi-pine)", status: "Coming soon", towns: "West Bend · Hartford · Germantown · Jackson" },
  { county: "Milwaukee", color: "var(--wi-cranberry)", status: "Coming soon", towns: "Whitefish Bay · Shorewood · Wauwatosa · Bayside" },
  { county: "Sheboygan", color: "var(--wi-sunset)", status: "On the map", towns: "Sheboygan · Plymouth · Kohler · Elkhart Lake" },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-16">
        <SectionDivider label="Our mission" className="mb-5" />
        <h1 className="font-display max-w-3xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
          A digital welcome mat for{" "}
          <span className="text-primary">Wisconsin</span> towns.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-foreground/70">
          Meet the locals, grab a coupon, and feel at home — wherever you land.
          Hearth Handbook is a hand-curated, community-first guide built for the
          people who actually live, work and visit each town we cover.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[var(--shadow-cta)] hover:bg-primary/90"
          >
            <Link to="/towns">
              Browse towns <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-14 rounded-full border-foreground/15 px-7 text-base font-medium"
          >
            <a href="mailto:igor@halolabsai.com">Get in touch</a>
          </Button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <SectionDivider label="How it works" className="mb-6" />
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-cta)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/45">
                    Step 0{i + 1}
                  </span>
                </div>
                <h3 className="font-display mt-5 text-xl font-extrabold uppercase tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-foreground/65">{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COVERAGE */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <SectionDivider label="Current coverage" className="mb-6" />
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-3">
              <Map className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/55">
                Ozaukee County · Live now
              </span>
            </div>
            <h2 className="font-display mt-3 text-3xl font-extrabold uppercase leading-tight tracking-tight">
              We're starting where we live.
            </h2>
            <p className="mt-3 max-w-md text-foreground/70">
              Eight Ozaukee County towns are live with curated guides — from
              Mequon's lakeshore corridor to the harbor at Port Washington and
              the small-town pace of Belgium and Fredonia.
            </p>
            <Button
              asChild
              className="mt-6 h-12 rounded-full bg-foreground px-6 text-background hover:bg-foreground/90"
            >
              <Link to="/towns">See all towns</Link>
            </Button>
          </div>
          <div className="rounded-3xl bg-foreground p-8 text-background shadow-[var(--shadow-soft)]">
            <SectionDivider
              label="By the numbers"
              className="mb-5 [&_span]:text-background/60 [&_span:first-child]:text-background"
            />
            <ul className="space-y-4 text-sm">
              <li className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-background/70">Towns live</span>
                <span className="font-display text-3xl font-extrabold">8</span>
              </li>
              <li className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-background/70">Counties on the map</span>
                <span className="font-display text-3xl font-extrabold">4</span>
              </li>
              <li className="flex items-baseline justify-between gap-4">
                <span className="text-background/70">Local categories</span>
                <span className="font-display text-3xl font-extrabold">12+</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <SectionDivider label="Future towns roadmap" className="mb-6" />
        <div className="grid gap-4 md:grid-cols-2">
          {ROADMAP.map((r) => (
            <div
              key={r.county}
              className="flex items-start gap-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <span
                className="mt-1 inline-flex h-3 w-3 shrink-0 rounded-full"
                style={{ background: r.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-extrabold uppercase tracking-tight">
                    {r.county} County
                  </h3>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
                    style={{ background: r.color }}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/65">{r.towns}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM / STORY */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] md:grid-cols-[1fr_1.2fr] md:p-12">
          <div>
            <SectionDivider label="Our story" className="mb-5" />
            <h2 className="font-display text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Built for Wisconsin,
              <br />
              by Wisconsinites.
            </h2>
            <p className="mt-4 text-foreground/70">
              Hearth Handbook started as a printed welcome packet handed to new
              neighbors in Ozaukee County. We turned it into a living guide so
              every visitor and new resident gets the same warm introduction —
              with the locals front and center.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-background p-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--wi-lake)] text-white">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold">Local-first curation</h3>
                <p className="mt-1 text-sm text-foreground/65">
                  Every business is reviewed by a real person who lives in or
                  near the town — no scraped listings.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-background p-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--wi-cheddar)] text-[color:var(--wi-ink)]">
                <Heart className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold">Free for residents, forever</h3>
                <p className="mt-1 text-sm text-foreground/65">
                  Our guides will always be free to read. Sponsors keep the
                  lights on so the welcome mat stays out.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-background p-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold">Premium feel, small-town soul</h3>
                <p className="mt-1 text-sm text-foreground/65">
                  Designed with the warmth of a brochure on the kitchen
                  counter, and the polish of a national magazine.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="overflow-hidden rounded-3xl bg-foreground p-10 text-background md:p-14">
          <SectionDivider
            label="Get involved"
            className="mb-5 [&_span]:text-background/60 [&_span:first-child]:text-background"
          />
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <h2 className="font-display max-w-xl text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Want your town next?
              <br />
              We'd love to hear from you.
            </h2>
            <a
              href="mailto:igor@halolabsai.com"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <span>igor@halolabsai.com</span> <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
