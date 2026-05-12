import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Business, type Category, type Town, tierPriority } from "@/lib/towns";
import type { Packet } from "@/lib/packets";
import { Phone, Globe, MapPin, Mail, Star, Heart } from "lucide-react";

type LoaderData = {
  packet: Packet;
  realtor: any;
  town: Town | null;
  categories: Category[];
  businesses: Business[];
};

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }): Promise<LoaderData> => {
    const { data: packet } = await supabase
      .from("packets")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!packet) throw notFound();
    const p = packet as Packet;

    const [profileRes, townRes, catRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", p.realtor_id).maybeSingle(),
      p.town_id
        ? supabase.from("towns").select("*").eq("id", p.town_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("categories").select("*").order("display_order"),
    ]);

    const town = (townRes.data ?? null) as Town | null;
    let businesses: Business[] = [];
    if (town) {
      const { data: bizData } = await supabase.from("businesses").select("*").eq("town_id", town.id);
      businesses = (bizData ?? []) as Business[];
    }

    return {
      packet: p,
      realtor: profileRes.data,
      town,
      categories: (catRes.data ?? []) as Category[],
      businesses,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const p = loaderData.packet;
    return {
      meta: [
        { title: `Welcome Home, ${p.buyer_first_name} — Your neighborhood guide` },
        { name: "description", content: `A personalized welcome to your new home at ${p.address}.` },
        { property: "og:title", content: `Welcome Home, ${p.buyer_first_name}` },
        { property: "og:description", content: "Your personalized neighborhood guide." },
        ...(p.home_photo_url ? [{ property: "og:image", content: p.home_photo_url }] : []),
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
  const { packet, realtor, town, categories, businesses } = Route.useLoaderData();

  const featured = businesses
    .filter((b) => b.sponsor_tier !== "none")
    .sort(
      (a, b) => tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier] || a.featured_order - b.featured_order,
    );

  const platinum = featured.filter((b) => b.sponsor_tier === "s_tier" || b.sponsor_tier === "gold").slice(0, 3);
  const gold = featured.filter((b) => b.sponsor_tier === "silver" || b.sponsor_tier === "bronze");

  const byCategory = new Map<string, Business[]>();
  for (const b of businesses) {
    const arr = byCategory.get(b.category_id) ?? [];
    arr.push(b);
    byCategory.set(b.category_id, arr);
  }
  const cats = categories.filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <header className="relative">
        <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden bg-foreground">
          {packet.home_photo_url ? (
            <img
              src={packet.home_photo_url}
              alt={packet.address}
              className="h-full w-full object-cover opacity-80"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[color:var(--wi-pine)]/40 via-foreground to-[color:var(--wi-cheddar)]/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-5 pb-12 text-background md:pb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-background/70">
              // Welcome home
            </p>
            <h1 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-6xl">
              {packet.buyer_first_name}{packet.buyer_last_name ? ` & family` : ""}.
            </h1>
            <p className="mt-3 max-w-xl text-base text-background/80 md:text-lg">
              {packet.address}{town ? ` · ${town.name}, ${town.state}` : ""}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        {/* Realtor mini-card */}
        {realtor && (
          <section className="mb-12 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-foreground text-background">
                {realtor.headshot_url ? (
                  <img src={realtor.headshot_url} alt={realtor.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                    {(realtor.full_name ?? "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="eyebrow">// A note from your realtor</p>
                <h2 className="font-display mt-1 text-xl font-extrabold uppercase tracking-tight">
                  {realtor.full_name}
                </h2>
                {realtor.brokerage_name && (
                  <p className="text-sm text-muted-foreground">{realtor.brokerage_name}</p>
                )}
                {packet.welcome_note && (
                  <p className="mt-3 whitespace-pre-line text-foreground/80">{packet.welcome_note}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {realtor.email_public && (
                    <a href={`mailto:${realtor.email_public}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Mail className="h-3.5 w-3.5" /> {realtor.email_public}</a>
                  )}
                  {realtor.phone && (
                    <a href={`tel:${realtor.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone className="h-3.5 w-3.5" /> {realtor.phone}</a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Featured sponsors (Platinum) */}
        {platinum.length > 0 && (
          <section className="mb-12">
            <p className="eyebrow">// Locals we love</p>
            <h2 className="font-display mt-2 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
              Hand-picked for you
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {platinum.map((b) => (
                <FeaturedCard key={b.id} b={b} />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {town && cats.length > 0 && (
          <section className="space-y-10">
            <div>
              <p className="eyebrow">// Around {town.name}</p>
              <h2 className="font-display mt-2 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
                Your neighborhood guide
              </h2>
              {town.hero_blurb && <p className="mt-3 max-w-2xl text-foreground/70">{town.hero_blurb}</p>}
            </div>

            {cats.map((c) => (
              <div key={c.id}>
                <h3 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">{c.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(byCategory.get(c.id) ?? [])
                    .sort((a, b) => tierPriority[b.sponsor_tier] - tierPriority[a.sponsor_tier])
                    .map((b) => (
                      <BusinessRow key={b.id} b={b} />
                    ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Gold sponsors row */}
        {gold.length > 0 && (
          <section className="mt-12">
            <p className="eyebrow">// Also recommended</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {gold.slice(0, 8).map((b) => <BusinessRow key={b.id} b={b} />)}
            </div>
          </section>
        )}

        {/* Realtor thank-you footer */}
        {realtor && (
          <section className="mt-16 rounded-3xl bg-foreground p-8 text-background md:p-12">
            <Heart className="h-7 w-7 text-primary" />
            <h2 className="font-display mt-4 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
              Thank you, {packet.buyer_first_name}.
            </h2>
            <p className="mt-3 max-w-xl text-background/80">
              It's been an honor helping you find home. If a friend or family member is thinking
              about a move, I'd love to help them too.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {realtor.email_public && (
                <a href={`mailto:${realtor.email_public}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <Mail className="h-4 w-4" /> Refer a friend
                </a>
              )}
              {realtor.phone && (
                <a href={`tel:${realtor.phone}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-background/20 px-5 text-sm font-semibold hover:bg-background/10">
                  <Phone className="h-4 w-4" /> Call {realtor.full_name?.split(" ")[0]}
                </a>
              )}
            </div>
          </section>
        )}

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Made with care · Welcome Home
        </p>
      </main>
    </div>
  );
}

function FeaturedCard({ b }: { b: Business }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Star className="h-3 w-3" /> Featured
      </div>
      {b.logo_url && <img src={b.logo_url} alt={b.name} className="mb-4 h-12 w-auto object-contain" />}
      <h3 className="font-display text-lg font-extrabold uppercase tracking-tight">{b.name}</h3>
      {b.subcategory && <p className="text-xs text-muted-foreground">{b.subcategory}</p>}
      {b.description && <p className="mt-2 text-sm text-foreground/80">{b.description}</p>}
      {b.coupon_text && (
        <div className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          🎟 {b.coupon_text}
        </div>
      )}
      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        {b.address && <p className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {b.address}</p>}
        {b.phone && <p><a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone className="h-3 w-3" /> {b.phone}</a></p>}
        {b.website && <p><a href={b.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground"><Globe className="h-3 w-3" /> Visit</a></p>}
      </div>
    </div>
  );
}

function BusinessRow({ b }: { b: Business }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold leading-tight">{b.name}</h4>
        {b.sponsor_tier !== "none" && (
          <Star className="h-3.5 w-3.5 shrink-0 text-primary" />
        )}
      </div>
      {b.subcategory && <p className="text-xs text-muted-foreground">{b.subcategory}</p>}
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {b.address && <p>{b.address}</p>}
        {b.phone && <a href={`tel:${b.phone}`} className="block hover:text-foreground">{b.phone}</a>}
      </div>
      {b.coupon_text && (
        <div className="mt-2 text-[11px] font-semibold text-primary">🎟 {b.coupon_text}</div>
      )}
    </div>
  );
}
