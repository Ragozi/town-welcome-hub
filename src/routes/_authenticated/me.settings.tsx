import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  updateSubscriberPrefs,
  toggleMarketingOptIn,
  listMyOptIns,
  deleteMyAccount,
} from "@/lib/subscriber.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/me/settings")({
  component: SettingsPage,
});

const INTERESTS = ["Food", "Coffee", "Kids", "Pets", "Fitness", "Outdoors", "Nightlife", "Shopping", "Family", "Arts"];
const TOPICS = [
  { id: "local_deals" as const, label: "Local deals & coupons" },
  { id: "new_businesses" as const, label: "New business openings" },
  { id: "town_events" as const, label: "Town events" },
  { id: "realtor_recommendations" as const, label: "Realtor recommendations" },
];

function SettingsPage() {
  const { subscriberProfile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const updatePrefs = useServerFn(updateSubscriberPrefs);
  const toggleOpt = useServerFn(toggleMarketingOptIn);
  const fetchOpt = useServerFn(listMyOptIns);
  const deleteAcct = useServerFn(deleteMyAccount);

  const [towns, setTowns] = useState<{ id: string; name: string }[]>([]);
  const [townId, setTownId] = useState<string | null>(subscriberProfile?.home_town_id ?? null);
  const [interests, setInterests] = useState<string[]>(subscriberProfile?.interest_tags ?? []);
  const [hasKids, setHasKids] = useState(subscriberProfile?.has_kids ?? false);
  const [hasPets, setHasPets] = useState(subscriberProfile?.has_pets ?? false);
  const [saving, setSaving] = useState(false);

  const { data: optInData, refetch: refetchOpt } = useQuery({
    queryKey: ["my-opt-ins"],
    queryFn: () => fetchOpt(),
  });

  const activeTopics = new Set(
    (optInData?.subscriptions ?? []).filter((s: any) => !s.opted_out_at).map((s: any) => s.topic),
  );

  useEffect(() => {
    supabase.from("towns").select("id, name").order("name").then(({ data }) => setTowns(data ?? []));
  }, []);

  const savePrefs = async () => {
    setSaving(true);
    await updatePrefs({
      data: { home_town_id: townId, interest_tags: interests, has_kids: hasKids, has_pets: hasPets },
    });
    await refreshProfile();
    setSaving(false);
    toast.success("Saved");
  };

  const flipTopic = async (topic: typeof TOPICS[number]["id"], on: boolean) => {
    await toggleOpt({ data: { topic, opt_in: on, source: "preferences" } });
    refetchOpt();
  };

  const onDelete = async () => {
    try {
      await deleteAcct();
      await signOut();
      navigate({ to: "/" });
      toast.success("Account deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete account");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="eyebrow">// Preferences</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold uppercase tracking-tight">Your preferences</h1>
      </div>

      <Card title="Home town">
        <select
          value={townId ?? ""}
          onChange={(e) => setTownId(e.target.value || null)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="">Select…</option>
          {towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Card>

      <Card title="Interests">
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setInterests((c) => c.includes(tag) ? c.filter((t) => t !== tag) : [...c, tag])}
              className={`rounded-full border px-4 py-1.5 text-sm ${interests.includes(tag) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >{tag}</button>
          ))}
        </div>
        <div className="mt-4 flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasKids} onCheckedChange={(v) => setHasKids(!!v)} /> Kids
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasPets} onCheckedChange={(v) => setHasPets(!!v)} /> Pets
          </label>
        </div>
        <Button onClick={savePrefs} disabled={saving} className="mt-5 rounded-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </Card>

      <Card title="Email subscriptions">
        <div className="space-y-3">
          {TOPICS.map((t) => (
            <label key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <span className="text-sm font-medium">{t.label}</span>
              <Checkbox
                checked={activeTopics.has(t.id)}
                onCheckedChange={(v) => flipTopic(t.id, !!v)}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card title="Danger zone">
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all your saved items, preferences, and email subscriptions.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4 rounded-full">
              <Trash2 className="mr-2 h-4 w-4" /> Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone. All your data will be erased.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete forever</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
