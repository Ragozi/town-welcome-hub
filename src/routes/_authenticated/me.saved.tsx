import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSaved, toggleSaved, redeemCoupon } from "@/lib/subscriber.functions";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Check, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/me/saved")({
  component: SavedPage,
});

function SavedPage() {
  const fetchSaved = useServerFn(listSaved);
  const removeFn = useServerFn(toggleSaved);
  const redeemFn = useServerFn(redeemCoupon);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-saved"],
    queryFn: () => fetchSaved(),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const remove = async (item_type: "business" | "coupon" | "packet", item_id: string) => {
    await removeFn({ data: { item_type, item_id, save: false } });
    refetch();
    toast.success("Removed");
  };

  const toggleRedeem = async (id: string, isRedeemed: boolean) => {
    await redeemFn({ data: { business_id: id, redeem: !isRedeemed } });
    refetch();
  };

  const empty = !data || (data.businesses.length === 0 && data.coupons.length === 0 && data.packets.length === 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">// Saved</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold uppercase tracking-tight">My favorites</h1>
      </div>

      {empty && (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Nothing saved yet. Tap the heart on anything you like.
        </div>
      )}

      {data && data.coupons.length > 0 && (
        <Section title="Coupons">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.coupons.map((row: any) => row.item && (
              <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{row.item.name}</h3>
                    <p className="mt-1 text-sm font-medium text-primary">{row.item.coupon_text}</p>
                    {row.item.coupon_expires && <p className="text-xs text-muted-foreground">Expires {row.item.coupon_expires}</p>}
                  </div>
                  <button onClick={() => remove("coupon", row.item_id)} className="text-primary"><Heart className="h-4 w-4 fill-current" /></button>
                </div>
                <Button
                  size="sm"
                  variant={row.redeemed_at ? "default" : "outline"}
                  onClick={() => toggleRedeem(row.item_id, !!row.redeemed_at)}
                  className="mt-3 w-full rounded-full"
                >
                  {row.redeemed_at ? <><Check className="mr-1 h-3 w-3" /> Redeemed</> : <><Tag className="mr-1 h-3 w-3" /> Mark redeemed</>}
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data && data.businesses.length > 0 && (
        <Section title="Businesses">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.businesses.map((row: any) => row.item && (
              <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{row.item.name}</h3>
                    {row.item.address && <p className="text-xs text-muted-foreground">{row.item.address}</p>}
                  </div>
                  <button onClick={() => remove("business", row.item_id)} className="text-primary"><Heart className="h-4 w-4 fill-current" /></button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data && data.packets.length > 0 && (
        <Section title="Welcome packets">
          <div className="grid gap-4 md:grid-cols-2">
            {data.packets.map((row: any) => row.item && (
              <a key={row.id} href={`/p/${row.item.slug}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-card p-4 hover:bg-foreground/5">
                <h3 className="font-semibold">{row.item.buyer_first_name}'s packet</h3>
                <p className="text-xs text-muted-foreground">{row.item.address}</p>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-extrabold uppercase tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
