import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [emailPublic, setEmailPublic] = useState("");
  const [phone, setPhone] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [defaultTownId, setDefaultTownId] = useState<string>("");
  const [thankYou, setThankYou] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setEmailPublic(profile.email_public ?? "");
    setPhone(profile.phone ?? "");
    setBrokerageName(profile.brokerage_name ?? "");
    setDefaultTownId(profile.default_town_id ?? "");
    setThankYou(profile.thank_you_message ?? "");
    setHeadshotUrl(profile.headshot_url ?? "");
    setLogoUrl(profile.brokerage_logo_url ?? "");
    setInstagram(profile.social_links?.instagram ?? "");
    setFacebook(profile.social_links?.facebook ?? "");
    setWebsite(profile.social_links?.website ?? "");
  }, [profile]);

  const towns = useQuery({
    queryKey: ["towns-full"],
    queryFn: async () => {
      const { data } = await supabase.from("towns").select("id, name").order("name");
      return data ?? [];
    },
  });

  const upload = async (
    bucket: "headshots" | "brokerage-logos",
    file: File,
    set: (url: string) => void,
  ) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed.", { description: error.message });
      return;
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    set(pub.publicUrl);

    const patch =
      bucket === "headshots"
        ? { headshot_url: pub.publicUrl }
        : { brokerage_logo_url: pub.publicUrl };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", user.id);
    if (updateError) {
      toast.error("Saved to storage but couldn't update profile.", {
        description: updateError.message,
      });
      return;
    }
    await refreshProfile();
    toast.success("Image saved.");
  };

  const removeImage = async (
    bucket: "headshots" | "brokerage-logos",
    set: (url: string) => void,
  ) => {
    if (!user) return;
    const patch =
      bucket === "headshots" ? { headshot_url: null } : { brokerage_logo_url: null };
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
    if (error) {
      toast.error("Could not remove image.", { description: error.message });
      return;
    }
    set("");
    await refreshProfile();
    toast.success("Image removed.");
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email_public: emailPublic,
        phone,
        brokerage_name: brokerageName,
        default_town_id: defaultTownId || null,
        thank_you_message: thankYou,
        headshot_url: headshotUrl || null,
        brokerage_logo_url: logoUrl || null,
        social_links: { instagram, facebook, website },
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save.", { description: error.message });
      return;
    }
    await refreshProfile();
    toast.success("Profile saved.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">// Branding</p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
          Your profile
        </h1>
        <p className="mt-2 text-muted-foreground">Shown to buyers on every welcome packet.</p>
      </div>

      <div className="space-y-6 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Brokerage">
            <Input value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} />
          </Field>
          <Field label="Public email">
            <Input
              type="email"
              value={emailPublic}
              onChange={(e) => setEmailPublic(e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ImageField
            label="Headshot"
            url={headshotUrl}
            onUrl={setHeadshotUrl}
            onUpload={(f) => upload("headshots", f, setHeadshotUrl)}
            onRemove={() => removeImage("headshots", setHeadshotUrl)}
            shape="circle"
          />
          <ImageField
            label="Brokerage logo"
            url={logoUrl}
            onUrl={setLogoUrl}
            onUpload={(f) => upload("brokerage-logos", f, setLogoUrl)}
            onRemove={() => removeImage("brokerage-logos", setLogoUrl)}
            shape="square"
          />
        </div>

        <Field label="Default town">
          <Select value={defaultTownId} onValueChange={setDefaultTownId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a town" />
            </SelectTrigger>
            <SelectContent>
              {(towns.data ?? []).map((t: { id: string; name: string }) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Default thank-you message">
          <Textarea
            value={thankYou}
            onChange={(e) => setThankYou(e.target.value)}
            rows={3}
            placeholder="Pre-fills the welcome note on every new handbook."
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Instagram">
            <Input
              placeholder="@yourhandle"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </Field>
          <Field label="Facebook">
            <Input
              placeholder="facebook.com/…"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
            />
          </Field>
          <Field label="Website">
            <Input
              placeholder="https://…"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={saving}
            className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-1 h-4 w-4" /> Save
              </>
            )}
          </Button>
        </div>
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

function ImageField({
  label,
  url,
  onUrl,
  onUpload,
  onRemove,
  shape,
}: {
  label: string;
  url: string;
  onUrl: (s: string) => void;
  onUpload: (file: File) => void;
  onRemove?: () => void | Promise<void>;
  shape: "circle" | "square";
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
        <div
          className={
            "h-16 w-16 overflow-hidden bg-foreground " +
            (shape === "circle" ? "rounded-full" : "rounded-xl")
          }
        >
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-foreground/40">
            <Upload className="h-3.5 w-3.5" /> Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
          </label>
          {url && (
            <button
              type="button"
              onClick={() => (onRemove ? onRemove() : onUrl(""))}
              className="ml-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
