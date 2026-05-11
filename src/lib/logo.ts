import type { Business, Category } from "@/lib/towns";

/**
 * Map a category slug to Unsplash search keywords for fallback imagery.
 * If a category is unknown, we fall back to "main street wisconsin".
 */
const CATEGORY_KEYWORDS: Record<string, string> = {
  restaurants: "restaurant,food",
  food: "restaurant,food",
  dining: "restaurant,dining",
  coffee: "coffee,cafe",
  cafes: "coffee,cafe",
  shopping: "boutique,storefront",
  shops: "boutique,storefront",
  retail: "boutique,storefront",
  services: "storefront,smalltown",
  health: "wellness,clinic",
  wellness: "wellness,spa",
  outdoors: "park,wisconsin",
  parks: "park,wisconsin,nature",
  schools: "school,classroom",
  education: "school,library",
  government: "townhall,cityhall",
  civic: "townhall,cityhall",
  nightlife: "bar,pub",
  entertainment: "concert,music",
  home: "hardware,workshop",
  trades: "workshop,tools",
};

/**
 * Stable image URL for a business card.
 * 1) Use uploaded logo if present.
 * 2) Otherwise pull a category-themed Unsplash image, keyed by business id
 *    so each business gets a stable but unique fallback.
 */
export function businessImage(b: Business, c?: Category): string {
  if (b.logo_url) return b.logo_url;
  const kw = (c && CATEGORY_KEYWORDS[c.slug]) || "main street,wisconsin";
  // source.unsplash.com returns a redirect to a real photo; sig keeps it stable.
  return `https://source.unsplash.com/600x600/?${encodeURIComponent(kw)}&sig=${b.id.slice(0, 8)}`;
}

/** Per-town hero image overrides (real town logos / crests). */
export const TOWN_HERO_OVERRIDES: Record<string, { src: string; fit: "cover" | "contain" }> = {
  grafton: {
    src: "https://www.villageofgraftonwi.gov/ImageRepository/Document?documentID=18951",
    fit: "contain",
  },
};

/** Town hero image fallback. source.unsplash.com is deprecated, so we use
 *  picsum (deterministic by slug) for a real photo when no override exists. */
export function townHeroImage(slug: string, _name: string): { src: string; fit: "cover" | "contain" } {
  const override = TOWN_HERO_OVERRIDES[slug];
  if (override) return override;
  // Deterministic seed → stable photo
  return { src: `https://picsum.photos/seed/${encodeURIComponent(slug)}-wi/900/1200`, fit: "cover" };
}

/** Initials for a business — used as ultimate onError fallback. */
export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Pick a stable WI palette color for a business based on its id. */
export const WI_TOKENS = [
  "var(--wi-lake)",
  "var(--wi-cranberry)",
  "var(--wi-pine)",
  "var(--wi-cheddar)",
  "var(--wi-sunset)",
  "var(--wi-barn)",
  "var(--wi-sky)",
  "var(--wi-corn)",
];

export function tokenForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return WI_TOKENS[h % WI_TOKENS.length];
}
