/**
 * Business recommender — centralized scoring for the handbook + landing page.
 *
 * Each buyer packet carries `interests` (e.g. "biking", "pet friendly") and
 * `lifestyle_tags`. We combine those with each scraped business's category
 * slug, subcategory, name, and description to produce a ranked list with
 * auditable reason codes. The same module is used by:
 *   - getHandbookData (PDF generation)
 *   - getPublicPacket (public /p/$slug landing page)
 *
 * Scoring weights (tune here, not in callers):
 *   town/zip match:     +50  (baseline; non-matching dropped by caller)
 *   verified business:  +15
 *   sponsor s_tier:     +40
 *   sponsor gold:       +25
 *   sponsor silver:     +15
 *   sponsor bronze:     +8
 *   category map hit:   +20 per matching interest
 *   subcategory hit:    +30 per matching interest
 *   keyword in name:    +12 per matching interest
 *   keyword in desc:    +6  per matching interest
 *   manual pin:         +1000  (always surfaces)
 *
 * Edit INTEREST_RULES to add or refine interest-tag → business mappings.
 */

import type { SponsorTier } from "@/lib/towns";

// Minimal shape so this module works for both Business and PublicBusiness.
export type ScorableBusiness = {
  id: string;
  name: string;
  category_id: string;
  subcategory: string | null;
  description: string | null;
  sponsor_tier: SponsorTier;
};

export type ScorableCategory = {
  id: string;
  slug: string;
  name: string;
};

export type RecommendReason =
  | { code: "interest_match"; tag: string; via: "category" | "subcategory" | "keyword_name" | "keyword_desc" }
  | { code: "sponsor"; tier: SponsorTier }
  | { code: "verified" }
  | { code: "fallback_essential"; category: string }
  | { code: "manual_pin" };

export type ScoredBusiness<B extends ScorableBusiness = ScorableBusiness> = {
  business: B;
  score: number;
  reasons: RecommendReason[];
};

type InterestRule = {
  categories?: string[]; // category slugs to match
  subcategories?: string[]; // case-insensitive substrings
  keywords?: string[]; // case-insensitive substrings in name/description
};

// Add or tweak interest → matching rules here.
const INTEREST_RULES: Record<string, InterestRule> = {
  "pet friendly": {
    categories: ["pets", "veterinary", "pet-services"],
    subcategories: ["dog groomer", "pet store", "veterinarian", "vet"],
    keywords: ["pet", "dog", "cat", "kennel", "groom"],
  },
  pets: {
    categories: ["pets", "veterinary"],
    keywords: ["pet", "dog", "cat"],
  },
  biking: {
    categories: ["outdoors", "recreation", "parks"],
    subcategories: ["bike shop", "cycling"],
    keywords: ["bike", "bicycle", "cycling", "trail"],
  },
  "family friendly": {
    categories: ["parks", "education", "kids", "family"],
    subcategories: ["family restaurant", "playground"],
    keywords: ["family", "kid", "children"],
  },
  "kids activities": {
    categories: ["kids", "parks", "education", "family"],
    keywords: ["kid", "children", "playground", "family"],
  },
  coffee: {
    categories: ["food-drink", "restaurants", "coffee"],
    subcategories: ["coffee shop", "cafe", "café"],
    keywords: ["coffee", "espresso", "cafe"],
  },
  restaurants: {
    categories: ["food-drink", "restaurants", "dining"],
    keywords: ["restaurant", "dining", "eatery"],
  },
  outdoors: {
    categories: ["outdoors", "parks", "recreation"],
    keywords: ["trail", "hike", "park", "outdoor"],
  },
  fitness: {
    categories: ["fitness", "health", "wellness"],
    subcategories: ["gym", "yoga", "pilates", "crossfit"],
    keywords: ["gym", "fitness", "yoga", "pilates"],
  },
  nightlife: {
    categories: ["food-drink", "nightlife", "restaurants"],
    subcategories: ["bar", "brewery", "pub", "tavern"],
    keywords: ["bar", "brewery", "pub", "cocktail"],
  },
  shopping: {
    categories: ["retail", "shopping"],
    keywords: ["shop", "boutique", "store"],
  },
  "home services": {
    categories: ["home-services", "services", "trades"],
    keywords: ["plumb", "electric", "hvac", "contractor", "handyman", "landscape"],
  },
};

// Categories considered essential — used as fallback when no interest match.
const ESSENTIAL_CATEGORY_SLUGS = [
  "grocery",
  "groceries",
  "pharmacy",
  "fuel",
  "gas",
  "schools",
  "medical",
  "health",
];

const SPONSOR_WEIGHT: Record<SponsorTier, number> = {
  s_tier: 40,
  gold: 25,
  silver: 15,
  bronze: 8,
  none: 0,
};

function normalizeTag(t: string): string {
  return t.trim().toLowerCase();
}

/**
 * Score and rank a flat list of businesses against a buyer's interests.
 * Returns ALL scored businesses, sorted by score desc. Callers can slice
 * to the desired top-N.
 */
export function scoreBusinesses<B extends ScorableBusiness>(input: {
  businesses: B[];
  categories: ScorableCategory[];
  interests: string[];
  pinnedIds?: Set<string>;
}): ScoredBusiness<B>[] {
  const { businesses, categories, interests, pinnedIds } = input;
  const catById = new Map(categories.map((c) => [c.id, c]));
  const tags = Array.from(new Set(interests.map(normalizeTag).filter(Boolean)));

  const scored: ScoredBusiness<B>[] = businesses.map((b) => {
    const reasons: RecommendReason[] = [];
    let score = 0;

    // Sponsor tier
    if (b.sponsor_tier !== "none") {
      score += SPONSOR_WEIGHT[b.sponsor_tier];
      reasons.push({ code: "sponsor", tier: b.sponsor_tier });
    }

    const cat = catById.get(b.category_id);
    const catSlug = cat?.slug.toLowerCase() ?? "";
    const sub = (b.subcategory ?? "").toLowerCase();
    const name = b.name.toLowerCase();
    const desc = (b.description ?? "").toLowerCase();

    for (const tag of tags) {
      const rule = INTEREST_RULES[tag];
      if (!rule) continue;

      if (rule.categories?.some((s) => catSlug === s.toLowerCase())) {
        score += 20;
        reasons.push({ code: "interest_match", tag, via: "category" });
      }
      if (rule.subcategories?.some((s) => sub.includes(s.toLowerCase()))) {
        score += 30;
        reasons.push({ code: "interest_match", tag, via: "subcategory" });
      }
      if (rule.keywords?.some((k) => name.includes(k.toLowerCase()))) {
        score += 12;
        reasons.push({ code: "interest_match", tag, via: "keyword_name" });
      }
      if (rule.keywords?.some((k) => desc.includes(k.toLowerCase()))) {
        score += 6;
        reasons.push({ code: "interest_match", tag, via: "keyword_desc" });
      }
    }

    if (pinnedIds?.has(b.id)) {
      score += 1000;
      reasons.push({ code: "manual_pin" });
    }

    // Fallback essentials get a small boost so they appear when nothing else matches.
    if (ESSENTIAL_CATEGORY_SLUGS.includes(catSlug)) {
      score += 5;
      reasons.push({ code: "fallback_essential", category: cat?.name ?? catSlug });
    }

    return { business: b, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Top N recommended businesses with reasons. Backfills from sponsors +
 * essentials if interest matches don't reach N.
 */
export function topRecommended<B extends ScorableBusiness>(
  scored: ScoredBusiness<B>[],
  n = 12,
): ScoredBusiness<B>[] {
  return scored.slice(0, n);
}

/**
 * Build a compact log keyed by business id for storage on packets.recommendation_log.
 * Only the top N are stored to keep row size sane.
 */
export function buildRecommendationLog<B extends ScorableBusiness>(
  scored: ScoredBusiness<B>[],
  n = 24,
): Record<string, { score: number; reasons: RecommendReason[]; name: string }> {
  const out: Record<string, { score: number; reasons: RecommendReason[]; name: string }> = {};
  for (const s of scored.slice(0, n)) {
    out[s.business.id] = { score: s.score, reasons: s.reasons, name: s.business.name };
  }
  return out;
}
