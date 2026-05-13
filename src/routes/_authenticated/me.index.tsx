import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyFeed, toggleSaved, redeemCoupon } from "@/lib/subscriber.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Heart, Tag, MapPin, Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/me/")({
  component: MyTownPage,
});

function MyTownPage() {
  const { subscriberProfile } = useAuth();
  const fetchFeed = useServerFn(getMyFeed);
  const saveFn = useServerFn(toggleSaved);
  const redeemFn = useServerFn(redeemCoupon);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-feed", subscriberProfile?.home_town_id],
    queryFn: () => fetchFeed(),
    enabled: !!subscriberProfile,
  });

  const [busy, setBusy] = useState<string | null>(null);

  const handleSave = async (item_type: "business" | "coupon" | "packet", item_id: string) => {
    setBusy(item_id);
    await saveFn({ data: { item_type, item_id, save: true } });
    setBusy(null);
    toast.success("Saved");
  };

  const handleRedeem = async (business_id: string) => {
    setBusy(business_id);
    await redeemFn({ data: { business_id, redeem: true } });
    setBusy(null);
    refetch();
    toast.success("Coupon marked as redeemed");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.town) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <p className="eyebrow">// Personalize</p>
        <h2 className="font-display mt-2 text-2xl font-extrabold uppercase">Pick your town</h2>
        <p className="mt-2 text-muted-foreground">We need a home town to personalize your feed.</p>
        <Button asChild className="mt-5 rounded-full"><Link to="/me/welcome">Set up preferences</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-border bg-card p-8">
        <p className="eyebrow">// My town</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold uppercase tracking-tight">
          Welcome to {data.town.name}.
        </h1>
        {data.town.hero_blurb && (
          <p className="mt-3 max-w-2xl text-foreground/70">{data.town.hero_blurb}</p>
        )}
      </div>

      {data.coupons.length > 0 && (
        <Section title="Active coupons" icon={<Tag className="h-4 w-4" />}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.coupons.map((c: any) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="mt-1 text-sm text-primary font-medium">{c.coupon_text}</p>
                    {c.coupon_expires && (
                      <p className="mt-1 text-xs text-muted-foreground">Expires {c.coupon_expires}</p>
                    )}
                  </div>
                  <button onClick={() => handleSave("coupon", c.id)} disabled={busy === c.id} className="text-muted-foreground hover:text-primary">
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRedeem(c.id)}
                  disabled={busy === c.id}
                  className="mt-3 w-full rounded-full"
                >
                  <Check className="mr-1 h-3 w-3" /> Mark redeemed
                </Button>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {data.sponsors.length > 0 && (
        <Section title="Featured sponsors" icon={<Sparkles className="h-4 w-4" />}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data.sponsors.map((b: any) => (
              <Card key={b.id}>
                <h3 className="font-semibold">{b.name}</h3>
                {b.address && <p className="mt-1 text-xs text-muted-foreground">{b.address}</p>}
                <button onClick={() => handleSave("business", b.id)} disabled={busy === b.id} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  <Heart className="h-3 w-3" /> Save
                </button>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {data.businesses.length > 0 && (
        <Section title="New around town" icon={<MapPin className="h-4 w-4" />}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.businesses.slice(0, 9).map((b: any) => (
              <Card key={b.id}>
                <h3 className="font-semibold">{b.name}</h3>
                {b.subcategory && <p className="text-xs text-muted-foreground">{b.subcategory}</p>}
                <button onClick={() => handleSave("business", b.id)} disabled={busy === b.id} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  <Heart className="h-3 w-3" /> Save
                </button>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 inline-flex items-center gap-2 font-display text-xl font-extrabold uppercase tracking-tight">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4">{children}</div>;
}
