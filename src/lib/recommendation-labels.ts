/**
 * Human-readable labels for recommendation reason codes emitted by
 * src/lib/business-recommender.ts. Used by the "Why these businesses?"
 * audit panel on the packet detail page.
 */
import type { RecommendReason } from "@/lib/business-recommender";

export function labelForReason(r: RecommendReason): string {
  switch (r.code) {
    case "interest_match":
      return `Interest: ${r.tag} (${prettyVia(r.via)})`;
    case "sponsor":
      return `Sponsor: ${r.tier.replace("_", " ")}`;
    case "verified":
      return "Verified local business";
    case "fallback_essential":
      return `Essential: ${r.category}`;
    case "manual_pin":
      return "Manually pinned";
  }
}

function prettyVia(via: "category" | "subcategory" | "keyword_name" | "keyword_desc"): string {
  switch (via) {
    case "category":
      return "category";
    case "subcategory":
      return "subcategory";
    case "keyword_name":
      return "name match";
    case "keyword_desc":
      return "description match";
  }
}

/** Pick a tailwind chip color from the reason kind. */
export function chipClassForReason(r: RecommendReason): string {
  switch (r.code) {
    case "manual_pin":
      return "bg-primary/15 text-primary";
    case "sponsor":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "verified":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "fallback_essential":
      return "bg-secondary text-foreground/70";
    case "interest_match":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
}
