import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Sparkles, Users, Target, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionDivider } from "@/components/section-divider";
import { SponsorInquiryForm } from "@/components/sponsor-inquiry-form";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sponsor")({
  head: () => ({
    meta: [
      { title: "Sponsor a town — Hearth Handbook" },
      {
        name: "description",
        content:
          "Get your business in front of every new homeowner in your Wisconsin town. Hearth Handbook sponsor listings appear inside the welcome packets realtors hand to buyers at closing.",
      },
      { property: "og:title", content: "Sponsor a town — Hearth Handbook" },
      {
        property: "og:description",
        content:
          "Be the first business new homeowners see when they move to your town.",
      },
      { property: "og:url", content: "https://hearthhandbook.com/sponsor" },
    ],
    links: [{ rel: "canonical", href: "https://hearthhandbook.com/sponsor" }],
  }),
  component: SponsorPage,
});

type Tier = {
  id: string;
  key: string;
  name: string;
  price_monthly: number;
  display_priority: number;
};

const TIER_BENEFITS: Record<string, { tagline: string; perks: string[]; highlight?: boolean }> = {
  none: {
    tagline: "Free directory listing",
    perks: [
      "Name, category and contact info in the directory",
      "Sorted after sponsors",
      "No coupon, no featured placement",
    ],
  },
  basic: {
    tagline: "Stand out in the directory",
    perks: [
      "Sorted above free listings",
      "Photo + extended description",
      "One coupon offer with expiration date",
      "Email support",
    ],
  },
  featured: {
    tagline: "Top of category, every time",
    perks: [
      "Featured row placement at the top of your category",
      "Larger card with full photo",
      "Coupon offer with expiration date",
      "Priority placement in the printable PDF",
      "Monthly performance email",
    ],
    highlight: true,
  },
  premier: {
    tagline: "Own your category in the town",
    perks: [
      "Exclusive top-of-page hero placement",
      "Featured everywhere your category appears",
      "Two coupon offers + branded photography slot",
      "Quarterly review with the Hearth team",
      "First-look at new towns before launch",
    ],
  },
};

const SPONSOR_EMAIL = "info@hearthhandbook.com";

function scrollToInquiry() {
  const el = document.getElementById("inquire");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SponsorPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("sponsor_tiers")
        .select("id,key,name,price_monthly,display_priority")
        .order("display_priority", { ascending: true });
      setTiers((data as Tier[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const handlePickTier = (key: string) => {
    setSelectedTier(key);
    setTimeout(scrollToInquiry, 0);
  };

  // Show paid tiers in the pricing grid; "none" is the free fallback we describe in copy.
  const paidTiers = tiers.filter((t) => t.key !== "none");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-16">
        <SectionDivider label="For local businesses" className="mb-5" />
        <h1 className="font-display max-w-3xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
          Be the first business new homeowners see in{" "}
          <span className="text-primary">your town</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-foreground/70">
          Every Hearth Handbook is a personalized welcome packet a realtor hands
          a buyer at closing. Sponsor a town, and your business shows up inside
          every one of those packets — with your photo, your offer, and a warm
          recommendation already built in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            type="button"
            size="lg"
            onClick={scrollToInquiry}
            className="h-14 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[var(--shadow-cta)] hover:bg-primary/90"
          >
            Get listed <ArrowRight className="ml-1 h-5 w-5" />
          </Button>
          <Link
            to="/about"
            className="inline-flex h-14 items-center gap-2 rounded-full border border-foreground/15 bg-background px-7 text-base font-medium text-foreground transition-colors hover:border-foreground/40"
          >
            How Hearth works <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* WHY IT WORKS */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <SectionDivider label="Why it works" className="mb-6" />
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "A captive audience",
              body: "Every closing in your town. Not impressions, not clicks — actual new neighbors deciding where to spend the next decade.",
            },
            {
              icon: Users,
              title: "A warm intro",
              body: "Your listing appears inside a packet curated by the buyer's realtor. That's a recommendation, not an ad.",
            },
            {
              icon: Sparkles,
              title: "No noise",
              body: "Hand-curated directories. Limited categories per town. No pop-ups, no auctions, no algorithm.",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-cta)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="font-display mt-5 text-xl font-extrabold uppercase tracking-tight">
                  {s.title}
                </h2>
                <p className="mt-2 text-sm text-foreground/65">{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TIERS */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <SectionDivider label="Sponsor tiers" className="mb-6" />
        <h2 className="font-display max-w-2xl text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
          Pick the level that fits your business.
        </h2>
        <p className="mt-3 max-w-xl text-foreground/70">
          Pricing is per town, per month. Free directory listings are also
          available — fill out the form and we'll add you to your category.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {loading && (
            <div className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Loading tiers…
            </div>
          )}
          {!loading && paidTiers.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              We're refreshing our sponsor tiers. Email us at{" "}
              <a href={`mailto:${SPONSOR_EMAIL}`} className="underline">
                info@hearthhandbook.com
              </a>{" "}
              for current pricing.
            </div>
          )}
          {paidTiers.map((t) => {
            const meta = TIER_BENEFITS[t.key] ?? {
              tagline: "Sponsor listing",
              perks: ["Custom placement — contact us for details"],
            };
            return (
              <div
                key={t.id}
                className={
                  "relative flex flex-col rounded-3xl border bg-card p-7 shadow-[var(--shadow-soft)] " +
                  (meta.highlight
                    ? "border-primary ring-2 ring-primary/15"
                    : "border-border")
                }
              >
                {meta.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight">
                  {t.name}
                </h3>
                <p className="mt-1 text-sm text-foreground/60">{meta.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-extrabold tracking-tight">
                    ${Number(t.price_monthly).toFixed(0)}
                  </span>
                  <span className="text-sm text-foreground/55">/ town / mo</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-foreground/75">
                  {meta.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  onClick={() => handlePickTier(t.key)}
                  className="mt-6 h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
                >
                  Claim this tier
                </Button>
              </div>
            );
          })}
        </div>

        {/* Free listing note */}
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-foreground/20 bg-background p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="eyebrow text-foreground/55">Just want to be in the directory?</span>
            <p className="mt-1 text-sm text-foreground/75">
              Free listings include name, category and contact info — no photo or coupon. Sorted after sponsors.
            </p>
          </div>
          <a
            href={SPONSOR_MAILTO}
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
          >
            Get added free <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* WHAT IT LOOKS LIKE */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] md:grid-cols-[1fr_1.1fr] md:p-12">
          <div>
            <SectionDivider label="What buyers see" className="mb-5" />
            <h2 className="font-display text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Your business, on the kitchen counter.
            </h2>
            <p className="mt-4 text-foreground/70">
              Featured and Premier sponsors appear in a dedicated row at the top
              of the category. Basic sponsors sit above free listings with a
              photo and coupon. Every card links to your site, your phone, and
              Google Maps in one tap.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground/75">
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Photo + brand colors
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Coupon with expiration (Featured / Premier)
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Tap-to-call, tap-to-map, tap-to-website
              </li>
            </ul>
          </div>

          {/* Mock card */}
          <div className="flex items-center justify-center rounded-2xl bg-background p-8 shadow-inner">
            <article className="w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-soft)]">
              <div
                className="relative aspect-[4/3] w-full"
                style={{ background: "linear-gradient(135deg, var(--wi-cheddar), var(--wi-sunset))" }}
              >
                <span className="absolute inset-0 flex items-center justify-center font-display text-4xl font-extrabold tracking-tight text-white">
                  YB
                </span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold uppercase leading-tight tracking-tight">
                      Your Business
                    </h3>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Coffee · Bakery
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Featured
                  </span>
                </div>
                <p className="text-sm leading-snug text-foreground/75 line-clamp-2">
                  A short, warm description of who you are and why locals love you.
                </p>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
                  <Tag className="h-3.5 w-3.5" />
                  <span>10% off your first visit</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="overflow-hidden rounded-3xl bg-foreground p-10 text-background md:p-14">
          <SectionDivider
            label="Claim your category"
            className="mb-5 [&_span]:text-background/60 [&_span:first-child]:text-background"
          />
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <h2 className="font-display max-w-xl text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Only one Premier sponsor per category, per town.
            </h2>
            <a
              href={SPONSOR_MAILTO}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <span>info@hearthhandbook.com</span> <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
