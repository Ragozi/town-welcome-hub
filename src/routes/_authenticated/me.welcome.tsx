import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { detectAndSetTown, updateSubscriberPrefs, toggleMarketingOptIn } from "@/lib/subscriber.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/me/welcome")({
  component: WelcomePage,
});

const INTERESTS = ["Food", "Coffee", "Kids", "Pets", "Fitness", "Outdoors", "Nightlife", "Shopping", "Family", "Arts"];
const TOPICS = [
  { id: "local_deals" as const, label: "Local deals & coupons", desc: "Exclusive offers from businesses in your town." },
  { id: "new_businesses" as const, label: "New business openings", desc: "Be first to know when something new opens nearby." },
  { id: "town_events" as const, label: "Town events", desc: "Festivals, markets, and community happenings." },
  { id: "realtor_recommendations" as const, label: "Realtor recommendations", desc: "Local realtor intros if you're thinking about moving." },
];

function WelcomePage() {
  const { subscriberProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const detect = useServerFn(detectAndSetTown);
  const updatePrefs = useServerFn(updateSubscriberPrefs);
  const toggleOpt = useServerFn(toggleMarketingOptIn);

  const [towns, setTowns] = useState<{ id: string; name: string }[]>([]);
  const [townId, setTownId] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [hasKids, setHasKids] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [optIns, setOptIns] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("towns").select("id, name").order("name").then(({ data }) => setTowns(data ?? []));
    detect().then((r) => {
      if (r.town_id) setTownId(r.town_id);
    });
  }, [detect]);

  useEffect(() => {
    if (subscriberProfile?.home_town_id) setTownId(subscriberProfile.home_town_id);
    if (subscriberProfile?.interest_tags) setInterests(subscriberProfile.interest_tags);
    if (subscriberProfile?.has_kids) setHasKids(true);
    if (subscriberProfile?.has_pets) setHasPets(true);
  }, [subscriberProfile]);

  const toggleInterest = (tag: string) => {
    setInterests((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await updatePrefs({
        data: {
          home_town_id: townId,
          interest_tags: interests,
          has_kids: hasKids,
          has_pets: hasPets,
          mark_onboarded: true,
        },
      });
      for (const t of TOPICS) {
        if (optIns[t.id]) {
          await toggleOpt({ data: { topic: t.id, opt_in: true, source: "signup_prefs" } });
        }
      }
      await refreshProfile();
      toast.success("All set!");
      navigate({ to: "/me" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="eyebrow">// Welcome</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold uppercase tracking-tight">
          Let's personalize your feed
        </h1>
        <p className="mt-2 text-muted-foreground">A minute now, a better experience forever.</p>
      </div>

      <Section title="Your home town">
        <select
          value={townId ?? ""}
          onChange={(e) => setTownId(e.target.value || null)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="">Select a town…</option>
          {towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Section>

      <Section title="What are you into?">
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleInterest(tag)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                interests.includes(tag)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-foreground/5"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasKids} onCheckedChange={(v) => setHasKids(!!v)} /> Kids at home
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasPets} onCheckedChange={(v) => setHasPets(!!v)} /> Pets at home
          </label>
        </div>
      </Section>

      <Section title="Email me about (optional)">
        <p className="mb-3 text-xs text-muted-foreground">
          You can change these any time. We never share your email.
        </p>
        <div className="space-y-3">
          {TOPICS.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3">
              <Checkbox
                checked={!!optIns[t.id]}
                onCheckedChange={(v) => setOptIns((cur) => ({ ...cur, [t.id]: !!v }))}
              />
              <div>
                <Label className="cursor-pointer font-medium">{t.label}</Label>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting || !townId} className="h-12 rounded-full px-8">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display mb-4 text-lg font-extrabold uppercase tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
