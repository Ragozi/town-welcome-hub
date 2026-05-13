import { useState } from "react";
import { ExternalLink, MapPin, Phone, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Business, Category } from "@/lib/towns";
import { businessImage, initialsFor, tokenForId } from "@/lib/logo";

export function BusinessCard({
  b,
  category,
  variant = "grid",
}: {
  b: Business;
  category?: Category;
  /** "grid" = standard listing card; "featured" = larger, in featured row */
  variant?: "grid" | "featured";
}) {
  const isFeatured = variant === "featured";
  const sponsored = b.sponsor_tier !== "none";

  return (
    <article
      className={
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-all duration-300 hover:-translate-y-0.5 " +
        (isFeatured
          ? "min-w-[280px] max-w-[320px] shadow-[var(--shadow-soft)]"
          : "shadow-[var(--shadow-soft)]")
      }
    >
      <BusinessImage b={b} category={category} aspect={isFeatured ? "aspect-[4/3]" : "aspect-[5/3]"} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold uppercase leading-tight tracking-tight">
              {b.name}
            </h3>
            {b.subcategory && (
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {b.subcategory}
              </p>
            )}
          </div>
          {sponsored && (
            <Badge className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/15">
              {isFeatured ? "Featured" : "Sponsor"}
            </Badge>
          )}
        </div>

        {b.description && (
          <p className="text-sm leading-snug text-foreground/75 line-clamp-2">
            {b.description}
          </p>
        )}

        {b.coupon_text && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
            <Tag className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{b.coupon_text}</span>
          </div>
        )}

        <BusinessLinks b={b} />
      </div>
    </article>
  );
}

function BusinessImage({
  b,
  category,
  aspect,
}: {
  b: Business;
  category?: Category;
  aspect: string;
}) {
  const [errored, setErrored] = useState(false);
  const initials = initialsFor(b.name);
  const token = tokenForId(b.id);

  if (errored) {
    return (
      <div
        className={"relative w-full " + aspect}
        style={{ background: token, color: "white" }}
      >
        <span className="absolute inset-0 flex items-center justify-center font-display text-4xl font-extrabold tracking-tight">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={"relative w-full overflow-hidden " + aspect} style={{ background: token }}>
      <img
        src={businessImage(b, category)}
        alt={`Logo for ${b.name}${category?.name ? ` (${category.name})` : ""}`}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
    </div>
  );
}

function BusinessLinks({ b }: { b: Business }) {
  const items: React.ReactNode[] = [];
  if (b.phone)
    items.push(
      <a
        key="phone"
        href={`tel:${b.phone}`}
        className="inline-flex items-center gap-1 hover:text-primary"
      >
        <Phone className="h-3.5 w-3.5" /> {b.phone}
      </a>,
    );
  if (b.address)
    items.push(
      <a
        key="addr"
        href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 hover:text-primary"
      >
        <MapPin className="h-3.5 w-3.5" /> Map
      </a>,
    );
  if (b.website)
    items.push(
      <a
        key="web"
        href={b.website}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 hover:text-primary"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Site
      </a>,
    );
  if (!items.length) return null;
  return (
    <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
      {items}
    </div>
  );
}
