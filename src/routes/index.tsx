import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bird,
  QrCode,
  Sparkles,
  MapPin,
  Printer,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionDivider } from "@/components/section-divider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearth Handbook — Welcome packets for real estate buyers" },
      {
        name: "description",
        content:
          "A modern closing gift for realtors: hand-curated welcome packets with a QR code that drops your buyers into a personalized guide to their new town.",
      },
      {
        property: "og:title",
        content: "Hearth Handbook — Welcome packets for real estate buyers",
      },
      {
        property: "og:description",
        content:
          "Give every buyer a beautiful, personalized handbook for their new neighborhood — with a QR code on the closing card.",
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
                "Welcome packets and personalized neighborhood guides for real estate buyers, made by their realtor.",
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

const STEPS = [
  {
    icon: MapPin,
    label: "Step 01",
    title: "Pick the town",
    body: "Choose from our hand-curated Wisconsin towns — every restaurant, shop, park and service vetted by a local.",
  },
  {
    icon: Sparkles,
    label: "Step 02",
    title: "Personalize the packet",
    body: "Add your buyer's name, new address, kids, pets, and the things they love. Drop in a welcome note from you.",
  },
  {
    icon: QrCode,
    label: "Step 03",
    title: "Print the QR card",
    body: "Hand them a closing card with a QR code. They scan, and their personal handbook is right there — no app, no signup.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO --------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 pt-10 pb-16 md:grid-cols-[minmax(0,360px)_1fr] md:gap-12 md:pt-14">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-secondary shadow-[var(--shadow-soft)]">
          <span className="absolute left-4 top-4 z-10 rounded-full bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/70 backdrop-blur">
            // For Realtors
          </span>
          <img
            src={HERO_IMAGE}
            alt="A welcome packet card with a QR code resting on a Wisconsin home's kitchen counter"
            width={1200}
            height={840}
            fetchPriority="high"
            decoding="async"
            className="h-[420px] w-full object-cover md:h-full"
          />
        </div>

        <div className="flex flex-col justify-center">
          <SectionDivider label="Hearth Handbook / Realtor toolkit" className="mb-6" />
          <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl">
            The closing gift
            <br />
            <span className="relative inline-block">
              they'll actually
              <Bird className="absolute -right-12 -top-2 h-9 w-9 text-[color:var(--wi-cheddar)] animate-[wi-wiggle_2.4s_ease-in-out_infinite]" />
            </span>{" "}
            use.
          </h1>
          <p className="mt-5 max-w-md text-base text-foreground/70">
            Hearth Handbook turns every closing into a personalized welcome
            packet — a printed QR card that drops your buyers straight into a
            curated guide to their new town. You stay top-of-mind. They feel at
            home.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[var(--shadow-cta)] hover:bg-primary/90"
            >
              <Link to="/login">
                Start free <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Link
              to="/about"
              className="inline-flex h-14 items-center gap-2 rounded-full border border-foreground/15 bg-background px-6 text-base font-medium text-foreground transition-colors hover:border-foreground/40"
            >
              How it works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS ------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <SectionDivider label="How it works" className="mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-cta)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/45">
                    {s.label}
                  </span>
                </div>
                <h2 className="font-display mt-5 text-xl font-extrabold uppercase tracking-tight">
                  {s.title}
                </h2>
                <p className="mt-2 text-sm text-foreground/65">{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHAT THE BUYER SEES ----------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] md:grid-cols-[1.1fr_1fr] md:p-12">
          <div>
            <SectionDivider label="What your buyer gets" className="mb-5" />
            <h2 className="font-display text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              A handbook made
              <br />
              just for their new home.
            </h2>
            <p className="mt-4 max-w-md text-foreground/70">
              Their packet opens with a welcome note from you, the home address,
              and a curated list of restaurants, coffee, shops, parks and
              services in their new town — filtered to what matters to them.
              Coupons from local sponsors. No login. No spam.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground/75">
              <li className="flex items-start gap-3">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Personal welcome note + buyer's name on the cover
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Local picks tuned to kids, pets, and lifestyle interests
              </li>
              <li className="flex items-start gap-3">
                <Printer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Print-ready PDF + a beautiful live page behind the QR
              </li>
            </ul>
          </div>

          <div className="relative flex flex-col items-center justify-center rounded-2xl bg-background p-8 shadow-inner">
            <div className="rounded-2xl border-2 border-dashed border-foreground/20 bg-card px-10 py-8 text-center">
              <span className="eyebrow mb-3 block text-foreground/55">
                Welcome home, Sarah
              </span>
              <div className="mx-auto mb-3 grid h-32 w-32 grid-cols-8 grid-rows-8 gap-[2px] rounded-md bg-foreground p-2">
                {Array.from({ length: 64 }).map((_, i) => (
                  <span
                    key={i}
                    className={`rounded-[1px] ${
                      [0, 1, 2, 6, 7, 8, 14, 15, 17, 22, 24, 31, 33, 40, 47, 49, 50, 56, 57, 58, 62, 63].includes(i % 64) ||
                      i % 5 === 0
                        ? "bg-background"
                        : "bg-foreground"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/55">
                Scan for your handbook
              </p>
            </div>
            <p className="mt-5 max-w-xs text-center text-xs text-foreground/55">
              The card you hand them at closing. The link inside is one of one —
              made for this buyer, this address.
            </p>
          </div>
        </div>
      </section>

      {/* FOR BUYERS (small) ------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-dashed border-foreground/20 bg-background p-7 md:flex-row md:items-center">
          <div>
            <span className="eyebrow text-foreground/55">For new homeowners</span>
            <p className="mt-1 max-w-xl font-medium text-foreground/85">
              Got a QR code from your realtor? Just scan it — your personal
              Hearth Handbook is waiting.
            </p>
          </div>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
          >
            Learn more <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* SPONSOR BAND ------------------------------------------------ */}
      <section id="sponsor" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="overflow-hidden rounded-3xl bg-foreground p-10 text-background md:p-14">
          <SectionDivider
            label="For local businesses"
            className="mb-5 [&_span]:text-background/60 [&_span:first-child]:text-background"
          />
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <h2 className="font-display max-w-xl text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Be the first business locals see
              when they move to town.
            </h2>
            <Link
              to="/sponsor"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Get listed <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
