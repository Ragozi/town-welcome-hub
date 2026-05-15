import { useState } from "react";
import { z } from "zod";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  business_name: z.string().trim().min(1, "Required").max(120),
  contact_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  town: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.string().trim().max(120).optional().or(z.literal("")),
  tier_key: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

type FormState = z.input<typeof schema>;

type TierOption = { key: string; name: string };

const empty: FormState = {
  business_name: "",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  town: "",
  category: "",
  tier_key: "",
  message: "",
};

export function SponsorInquiryForm({
  tiers,
  defaultTier,
}: {
  tiers: TierOption[];
  defaultTier?: string;
}) {
  const [form, setForm] = useState<FormState>({ ...empty, tier_key: defaultTier ?? "" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    const payload = {
      business_name: parsed.data.business_name,
      contact_name: parsed.data.contact_name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      town: parsed.data.town || null,
      category: parsed.data.category || null,
      tier_key: parsed.data.tier_key || null,
      message: parsed.data.message || null,
    };
    const { error } = await supabase.from("sponsor_inquiries").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Something went wrong. Please email info@hearthhandbook.com.");
      return;
    }
    setSubmitted(true);
    setForm({ ...empty, tier_key: defaultTier ?? "" });
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h3 className="font-display mt-4 text-2xl font-extrabold uppercase tracking-tight">
          Inquiry received
        </h3>
        <p className="mt-3 text-foreground/70">
          Thanks — we'll be in touch within one business day at the email you provided.
        </p>
        <Button variant="outline" className="mt-6 rounded-full" onClick={() => setSubmitted(false)}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] md:p-10"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Business name" error={errors.business_name} required>
          <Input
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            placeholder="Acme Coffee Co."
          />
        </Field>
        <Field label="Your name" error={errors.contact_name} required>
          <Input
            value={form.contact_name}
            onChange={(e) => update("contact_name", e.target.value)}
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Email" error={errors.email} required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="jane@acmecoffee.com"
          />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(555) 123-4567"
          />
        </Field>
        <Field label="Website" error={errors.website}>
          <Input
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="acmecoffee.com"
          />
        </Field>
        <Field label="Town" error={errors.town}>
          <Input
            value={form.town}
            onChange={(e) => update("town", e.target.value)}
            placeholder="Cedarburg, WI"
          />
        </Field>
        <Field label="Category" error={errors.category}>
          <Input
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            placeholder="Coffee · Bakery"
          />
        </Field>
        <Field label="Sponsor tier" error={errors.tier_key}>
          <Select value={form.tier_key || undefined} onValueChange={(v) => update("tier_key", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a tier (or leave blank)" />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Anything else we should know?" error={errors.message}>
          <Textarea
            rows={4}
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="Tell us about your business and what category you'd like to claim."
          />
        </Field>
      </div>

      <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-foreground/55">
          We'll reply to your email within one business day.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="h-12 rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-[var(--shadow-cta)] hover:bg-primary/90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              Send inquiry <ArrowRight className="ml-1 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
