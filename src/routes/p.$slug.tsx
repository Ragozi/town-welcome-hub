import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { tierPriority } from "@/lib/towns";
import {
  getPublicPacket,
  issuePdfToken,
  type PublicBusiness,
  type PublicCategory,
} from "@/lib/public-packet.functions";
import { Phone, Globe, MapPin, Mail, Star, Heart, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { logEvent } from "@/lib/tracking.functions";
import { detectSource, getSessionId, readUtm } from "@/lib/tracking";
import { getPublicBaseUrl } from "@/lib/public-url";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const data = await getPublicPacket({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    return {
      meta: [
        {
          title: `Welcome Home, ${loaderData.buyer_first_name} — Your neighborhood guide`,
        },
        {
          name: "description",
          content: `A personalized welcome to ${loaderData.location_label ?? "your new neighborhood"}.`,
        },
        { property: "og:title", content: `Welcome Home, ${loaderData.buyer_first_name}` },
        { property: "og:description", content: "Your personalized neighborhood guide." },
        ...(loaderData.home_photo_url
          ? [{ property: "og:image", content: loaderData.home_photo_url }]
          : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase">Packet not found</h1>
        <p className="mt-2 text-muted-foreground">This welcome page may have been removed.</p>
      </div>
    </div>
  ),
  component: BuyerLanding,
});

function BuyerLanding() {
  const packet = Route.useLoaderData();
  const { realtor, town, categories, businesses } = packet;
  const log = useServerFn(logEvent);
  const [viewSaved, setViewSaved] = useState(false);

  // Fire landing_view + qr_scanned (if applicable) once on mount
  useEffect(() => {
    const session = getSessionId();
    const source = detectSource();
    const utm = readUtm();
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    const dayKey = `wh_view_${packet.slug}_${new Date().toISOString().slice(0, 10)}`;
    if (!sessionStorage.getItem(dayKey)) {
      sessionStorage.setItem(dayKey, "1");
      log({
        data: {
          packet_slug: packet.slug,
          event_type: "landing_view",
          source,
          referrer,
          session_id: session,
          utm,
        },
      })
        .then(() => {
          setViewSaved(true);
          setTimeout(() => setViewSaved(false), 3500);
        })
        .catch(() => {});
      if (source === "qr") {
        log({
          data: {
            packet_slug: packet.slug,
            event_type: "qr_scanned",
            source: "qr",
            session_id: session,
          },
        }).catch(() => {});
      }
    }
  }, [packet.slug, log]);

  const track = (
    event_type: "business_click" | "referral_click" | "sponsor_click" | "share_click",
    metadata: Record<string, unknown> = {},
  ) => {
    const session = getSessionId();
    log({
      data: {
        packet_slug: packet.slug,
        event_type,
        source: detectSource(),
        session_id: session,
        metadata,
      },
    }).catch(() => {});
  };

  const allBiz = businesses as PublicBusiness[];
  const allCats = categories as Category[];

  const featured = allBiz
    .filter((b: PublicBusiness) => b.sponsor_tier !== "none")
    .sort(
      (a: PublicBusiness, b: PublicBusiness) =>
        tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] ||
        a.featured_order - b.featured_order,
    );

  const platinum = featured
    .filter((b: PublicBusiness) => b.sponsor_tier === "s_tier" || b.sponsor_tier === "gold")
    .slice(0, 3);
  const gold = featured.filter(
    (b: PublicBusiness) => b.sponsor_tier === "silver" || b.sponsor_tier === "bronze",
  );

  const byCategory = new Map<string, PublicBusiness[]>();
  for (const b of allBiz) {
    const arr = byCategory.get(b.category_id) ?? [];
    arr.push(b);
    byCategory.set(b.category_id, arr);
  }
  const cats = allCats.filter((c: PublicCategory) => (byCategory.get(c.id)?.length ?? 0) > 0);

  const baseUrl = getPublicBaseUrl();
  const referralHref = realtor?.referral_slug
    ? `${baseUrl}/r/${realtor.referral_slug}?from=${packet.slug}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <header className="relative">
        <div className="relative h-[62vh] min-h-[460px] w-full overflow-hidden bg-foreground">
          {packet.home_photo_url ? (
            <img
              src={packet.home_photo_url}
              alt={packet.location_label ?? "Welcome home"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[color:var(--wi-pine)]/40 via-foreground to-[color:var(--wi-cheddar)]/30" />
          )}
          {/* Soft warm gradient — preserves image, lifts text */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-transparent" />

          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-6 pb-14 text-background md:pb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-background/70">
              // Welcome home
            </p>
            <h1 className="font-display mt-4 text-5xl font-extrabold uppercase leading-[0.92] tracking-tight md:text-7xl">
              {packet.buyer_first_name}
              {packet.buyer_last_name ? ` & family` : ""}.
            </h1>
            <p className="mt-4 max-w-xl text-base text-background/85 md:text-lg">
              {packet.location_label}
              {town ? ` · ${town.name}, ${town.state}` : ""}
            </p>
          </div>
        </div>
      </header>

      {/* Realtor branding band — promoted, just under hero */}
      {realtor && (
        <section className="relative z-10 -mt-16 px-5 md:-mt-20">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-border bg-card p-7 shadow-[0_30px_80px_-40px_rgba(60,40,20,0.35)] md:p-10">
            <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-8 md:text-left">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-foreground text-background ring-4 ring-background shadow-[var(--shadow-soft)] md:h-32 md:w-32">
                {realtor.headshot_url ? (
                  <img
                    src={realtor.headshot_url}
                    alt={realtor.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold">
                    {(realtor.full_name ?? "?")
                      .split(" ")
                      .map((s: string) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="eyebrow">// Your guide</p>
                <h2 className="font-display mt-1 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
                  {realtor.full_name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground md:justify-start">
                  {realtor.brokerage_logo_url && (
                    <img
                      src={realtor.brokerage_logo_url}
                      alt={realtor.brokerage_name ?? ""}
                      className="h-6 w-auto object-contain opacity-90"
                    />
                  )}
                  {realtor.brokerage_name && <span>{realtor.brokerage_name}</span>}
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                  {realtor.email_public && (
                    <a
                      href={`mailto:${realtor.email_public}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5" /> {realtor.email_public}
                    </a>
                  )}
                  {realtor.phone && (
                    <a
                      href={`tel:${realtor.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" /> {realtor.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {packet.welcome_note && (
              <div className="mt-8 border-t border-border pt-7">
                <p className="eyebrow">// A note for you</p>
                <p className="mt-3 whitespace-pre-line font-display text-lg leading-relaxed text-foreground/90 md:text-xl">
                  &ldquo;{packet.welcome_note}&rdquo;
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        {/* Featured sponsors (Platinum) */}
        {platinum.length > 0 && (
          <section className="mb-20">
            <p className="eyebrow">// Locals we love</p>
            <h2 className="font-display mt-2 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
              Hand-picked for you
            </h2>
            <p className="mt-2 max-w-xl text-foreground/60">
              A short list of the places we'd send a friend.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {platinum.map((b: PublicBusiness) => (
                <FeaturedCard
                  key={b.id}
                  b={b}
                  onClick={() => track("sponsor_click", { business_id: b.id, name: b.name })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {town && cats.length > 0 && (
          <section className="space-y-14">
            <div>
              <p className="eyebrow">// Around {town.name}</p>
              <h2 className="font-display mt-2 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
                Your neighborhood guide
              </h2>
              {town.hero_blurb && (
                <p className="mt-3 max-w-2xl text-foreground/70">{town.hero_blurb}</p>
              )}
            </div>

            {cats.map((c: PublicCategory) => {
              const list = (byCategory.get(c.id) ?? []).sort(
                (a: PublicBusiness, b: PublicBusiness) =>
                  tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier],
              );
              return (
                <div key={c.id}>
                  <div className="mb-5 flex items-baseline justify-between border-b border-border pb-3">
                    <h3 className="font-display text-xl font-extrabold uppercase tracking-tight">
                      {c.name}
                    </h3>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {list.length} {list.length === 1 ? "spot" : "spots"}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((b: PublicBusiness) => (
                      <BusinessRow
                        key={b.id}
                        b={b}
                        onClick={() =>
                          track("business_click", {
                            business_id: b.id,
                            name: b.name,
                            category: c.name,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Gold sponsors row */}
        {gold.length > 0 && (
          <section className="mt-16">
            <p className="eyebrow">// Also recommended</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gold.slice(0, 8).map((b: PublicBusiness) => (
                <BusinessRow
                  key={b.id}
                  b={b}
                  onClick={() => track("sponsor_click", { business_id: b.id, name: b.name })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Realtor thank-you footer */}
        {realtor && (
          <section className="mt-24 overflow-hidden rounded-[2rem] bg-gradient-to-br from-foreground via-foreground to-[color:var(--wi-pine)]/60 p-10 text-background shadow-[var(--shadow-soft)] md:p-14">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display mt-5 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
              Thank you, {packet.buyer_first_name}.
            </h2>
            <p className="mt-4 max-w-xl text-background/80">
              It's been an honor helping you find home. If a friend or family member is thinking
              about a move, I'd love to help them too.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {referralHref && (
                <a
                  href={referralHref}
                  onClick={() => track("referral_click", { referral_slug: realtor.referral_slug })}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  <Heart className="h-4 w-4" /> Refer a friend to{" "}
                  {realtor.full_name?.split(" ")[0] ?? "us"}
                </a>
              )}
              {realtor.email_public && (
                <a
                  href={`mailto:${realtor.email_public}`}
                  onClick={() => track("referral_click", { method: "email" })}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-background/20 px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-background/10"
                >
                  <Mail className="h-4 w-4" /> Email {realtor.full_name?.split(" ")[0] ?? "agent"}
                </a>
              )}
              {realtor.phone && (
                <a
                  href={`tel:${realtor.phone}`}
                  onClick={() => track("referral_click", { method: "phone" })}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-background/20 px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-background/10"
                >
                  <Phone className="h-4 w-4" /> Call {realtor.full_name?.split(" ")[0]}
                </a>
              )}
            </div>
          </section>
        )}

        <p className="mt-16 text-center text-xs text-muted-foreground">
          Made with care · Welcome Home
        </p>
      </main>

      {/* Subtle visit-saved confirmation */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-soft)] transition-all duration-500 ${
          viewSaved ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <Check className="h-3.5 w-3.5 text-primary" /> Saved your visit
      </div>
    </div>
  );
}

function FeaturedCard({ b, onClick }: { b: PublicBusiness; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Star className="h-3 w-3" /> Featured
      </div>
      {b.logo_url && (
        <img src={b.logo_url} alt={b.name} className="mb-4 h-12 w-auto object-contain" />
      )}
      <h3 className="font-display text-lg font-extrabold uppercase tracking-tight">{b.name}</h3>
      {b.subcategory && <p className="text-xs text-muted-foreground">{b.subcategory}</p>}
      {b.description && <p className="mt-2 text-sm text-foreground/80">{b.description}</p>}
      {b.coupon_text && (
        <div className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          🎟 {b.coupon_text}
        </div>
      )}
      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        {b.address && (
          <p className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> {b.address}
          </p>
        )}
        {b.phone && (
          <p>
            <a
              href={`tel:${b.phone}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="h-3 w-3" /> {b.phone}
            </a>
          </p>
        )}
        {b.website && (
          <p>
            <a
              href={b.website}
              target="_blank"
              rel="noreferrer"
              onClick={onClick}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Globe className="h-3 w-3" /> Visit
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function BusinessRow({ b, onClick }: { b: PublicBusiness; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold leading-tight">{b.name}</h4>
        {b.sponsor_tier !== "none" && <Star className="h-3.5 w-3.5 shrink-0 text-primary" />}
      </div>
      {b.subcategory && <p className="text-xs text-muted-foreground">{b.subcategory}</p>}
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {b.address && <p>{b.address}</p>}
        {b.phone && (
          <a href={`tel:${b.phone}`} onClick={onClick} className="block hover:text-foreground">
            {b.phone}
          </a>
        )}
      </div>
      {b.coupon_text && (
        <div className="mt-2 text-[11px] font-semibold text-primary">🎟 {b.coupon_text}</div>
      )}
    </div>
  );
}
