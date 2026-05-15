import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { createPacket } from "@/lib/packets";
import { listTowns } from "@/lib/towns";
import { previewTownBusinesses } from "@/lib/scraped.functions";
import { tierPriority, type SponsorTier } from "@/lib/towns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/packets/new")({
  component: NewPacket,
});

const INTEREST_OPTIONS = [
  "Coffee", "Wine & Beer", "Hiking", "Biking", "Boating", "Live music",
  "Farmers markets", "Foodie", "Family-friendly", "Date nights", "Yoga & fitness", "Pet-friendly",
];

const LIFESTYLE_OPTIONS = [
  "First-time homebuyers", "Empty nesters", "Young family", "Remote workers",
  "Retirees", "Newlyweds", "Relocating from out of state",
];

type Step = 1 | 2 | 3 | 4;

function NewPacket() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const towns = useQuery({ queryKey: ["towns"], queryFn: listTowns });
  const allTowns = useQuery({
    queryKey: ["towns-full"],
    queryFn: async () => {
      const { data } = await supabase.from("towns").select("id, name, slug, zip_codes").order("name");
      return data ?? [];
    },
  });

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [buyerFirst, setBuyerFirst] = useState("");
  const [buyerLast, setBuyerLast] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("WI");
  const [city, setCity] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [townId, setTownId] = useState<string>(profile?.default_town_id ?? "");
  const [zipNotice, setZipNotice] = useState<string | null>(null);

  const address = [street.trim(), [city, state].filter(Boolean).join(", "), zip.trim()]
    .filter(Boolean)
    .join(", ");

  // ZIP -> town auto-detect (uses local towns list; covers Ozaukee County)
  const onZipChange = (raw: string) => {
    const z = raw.replace(/\D/g, "").slice(0, 5);
    setZip(z);
    if (z.length !== 5) {
      setZipNotice(null);
      return;
    }
    const match = (allTowns.data ?? []).find((t: { zip_codes?: string[] | null }) =>
      (t.zip_codes ?? []).includes(z),
    );
    if (match) {
      setCity(match.name);
      setTownId(match.id);
      setState("WI");
      setZipNotice(`Matched ${match.name}, WI`);
    } else {
      setZipNotice("No matching town/village in our guide for that ZIP — pick a city manually.");
    }
  };
  const [welcomeNote, setWelcomeNote] = useState(
    profile?.thank_you_message ??
      "Welcome home! It's been a privilege helping you find this place. Here's a little guide to make settling in feel like a celebration."
  );
  const [hasKids, setHasKids] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<string[]>([]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const canNext = (() => {
    if (step === 1) return !!(buyerFirst.trim() && street.trim() && city.trim() && state && zip.length === 5);
    return true;
  })();

  const onGenerate = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const packet = await createPacket({
        realtor_id: user.id,
        buyer_first_name: buyerFirst.trim(),
        buyer_last_name: buyerLast.trim() || null,
        buyer_email: buyerEmail.trim() || null,
        address: address.trim(),
        closing_date: closingDate || null,
        welcome_note: welcomeNote.trim() || null,
        has_kids: hasKids,
        has_pets: hasPets,
        interests,
        lifestyle_tags: lifestyle,
        town_id: townId || null,
        status: "generated",
      });
      toast.success("Welcome packet created.");
      navigate({ to: "/packets/$id", params: { id: packet.id } });
    } catch (e) {
      console.error(e);
      toast.error("Could not create packet.", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <p className="text-sm text-muted-foreground">Step {step} of 4</p>
      </div>

      <div>
        <p className="eyebrow">// New Handbook</p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
          Create welcome handbook
        </h1>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={
              "h-1.5 flex-1 rounded-full " +
              (n <= step ? "bg-primary" : "bg-border")
            }
          />
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">Buyer info</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Buyer first name *">
                <Input value={buyerFirst} onChange={(e) => setBuyerFirst(e.target.value)} required />
              </Field>
              <Field label="Buyer last name">
                <Input value={buyerLast} onChange={(e) => setBuyerLast(e.target.value)} />
              </Field>
            </div>
            <Field label="Buyer email">
              <Input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
            </Field>
            <Field label="Street address *">
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="189 Mulberry Ln"
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="ZIP code *">
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => onZipChange(e.target.value)}
                  placeholder="53024"
                  required
                />
              </Field>
              <Field label="State *">
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WI">Wisconsin</SelectItem>
                    <SelectItem value="IL">Illinois</SelectItem>
                    <SelectItem value="MN">Minnesota</SelectItem>
                    <SelectItem value="MI">Michigan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="City / village *">
                <Select
                  value={city}
                  onValueChange={(v) => {
                    setCity(v);
                    const t = (allTowns.data ?? []).find((x) => x.name === v);
                    if (t) setTownId(t.id);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {(allTowns.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {zipNotice && (
              <p className="text-xs text-muted-foreground">{zipNotice}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Closing date">
                <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
              </Field>
              <Field label="Town (for local guide)">
                <Select value={townId} onValueChange={setTownId}>
                  <SelectTrigger><SelectValue placeholder="Auto-set from ZIP" /></SelectTrigger>
                  <SelectContent>
                    {(allTowns.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">Personalization</h2>
            <Field label="Personal welcome note">
              <Textarea
                value={welcomeNote}
                onChange={(e) => setWelcomeNote(e.target.value)}
                rows={5}
                placeholder="A few warm words for your buyer…"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow label="Has kids" checked={hasKids} onChange={setHasKids} />
              <ToggleRow label="Has pets" checked={hasPets} onChange={setHasPets} />
            </div>
            <Field label="Interests">
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((i) => (
                  <Chip key={i} label={i} active={interests.includes(i)} onClick={() => setInterests(toggle(interests, i))} />
                ))}
              </div>
            </Field>
            <Field label="Lifestyle tags">
              <div className="flex flex-wrap gap-2">
                {LIFESTYLE_OPTIONS.map((i) => (
                  <Chip key={i} label={i} active={lifestyle.includes(i)} onClick={() => setLifestyle(toggle(lifestyle, i))} />
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">Your branding</h2>
            <p className="text-sm text-muted-foreground">
              These come from your profile and are shown on the buyer's landing page and PDF.
            </p>
            <div className="rounded-2xl border border-border bg-secondary/40 p-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-foreground text-background">
                  {profile?.headshot_url ? (
                    <img src={profile.headshot_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                      {(profile?.full_name ?? "?").split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{profile?.full_name ?? "Add your name in Branding"}</p>
                  <p className="text-sm text-muted-foreground">{profile?.brokerage_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email_public} · {profile?.phone}</p>
                </div>
              </div>
            </div>
            <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Edit branding <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">Review & generate</h2>
            <ReviewRow label="Buyer" value={`${buyerFirst} ${buyerLast}`.trim() || "—"} />
            <ReviewRow label="Address" value={address || "—"} />
            <ReviewRow label="Closing date" value={closingDate || "—"} />
            <ReviewRow label="Town" value={(allTowns.data ?? []).find(t => t.id === townId)?.name ?? "—"} />
            <ReviewRow label="Interests" value={interests.length ? interests.join(", ") : "—"} />
            <ReviewRow label="Lifestyle" value={lifestyle.length ? lifestyle.join(", ") : "—"} />

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm text-foreground/80">
                  When you generate, we create the buyer's personalized landing page and a unique QR code instantly. The PDF will be ready for download from the packet detail page.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
          disabled={step === 1}
          className="rounded-full"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canNext}
            className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
          >
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onGenerate}
            disabled={submitting}
            className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 h-4 w-4" /> Generate packet</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground/70 hover:border-foreground/40")
      }
    >
      {active && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-3 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  );
}
