// Centralized filter rules for Firecrawl scrape results.
//
// Two layers of badness this catches:
//   1) Domain — aggregator/review sites (Yelp/Niche/Healthgrades), government
//      sites (.gov), social/forum (Facebook/Reddit), chain locator URLs
//      (walgreens.com/locator) that aren't a specific store.
//   2) URL/title — PDF documents, listicles ("2026 Best Places to…"),
//      directory pages ("County LICENSED Child Care Directory").
//
// Result: { ok: true, host } passes through to insert; { ok: false, reason }
// gets recorded as an excluded row so admins can audit what we filtered.
//
// The lists are intentionally aggressive — better to occasionally exclude a
// legit business and have an admin manually re-include it than to flood the
// Pending tab with junk that nobody reviews.

export type FilterResult =
  | { ok: true; host: string }
  | { ok: false; reason: string };

// Aggregator/review/directory sites — these never represent the business itself
const AGGREGATOR_HOSTS = [
  // Generic review/listing
  "yelp", "tripadvisor", "yellowpages", "mapquest", "allmenus", "foursquare",
  "citysearch", "niche", "thumbtack", "angi.com", "angieslist",
  // Social / forum / discussion
  "facebook", "instagram", "twitter", "x.com", "linkedin", "pinterest",
  "tiktok", "reddit", "nextdoor", "quora", "youtube",
  // Maps / search engines (Google snippets, Bing snippets, etc.)
  "google.", "bing.com", "duckduckgo.com",
  // Healthcare aggregators
  "healthgrades", "zocdoc", "vitals.com", "ratemds", "wellness.com",
  "solvhealth", "carelulu", "fertilityiq",
  // Restaurant / hospitality aggregators
  "opentable", "doordash", "ubereats", "grubhub", "seamless", "menupages",
  "tripsavvy",
  // School / education aggregators
  "privateschoolreview", "greatschools", "niche.com", "school-ratings",
  "preschoolfinder",
  // Real estate / "best places" listicles
  "redfin.com", "zillow.com", "realtor.com",
  // General listicle generators
  "expertise.com", "thumbtack.com",
];

const GOVERNMENT_RE = /(?:\.gov(?:[/?#:]|$))|(?:\.us(?:[/?#:]|$))/i;

// Specific chain locator paths that return generic store-finder pages rather
// than a single branch. Add more as you spot them.
const CHAIN_LOCATOR_RE =
  /(?:walgreens\.com\/(?:locator|store))|(?:cvs\.com\/store)|(?:riteaid\.com\/locations)|(?:walmart\.com\/store)|(?:target\.com\/sl)|(?:wellsfargo\.com\/locator)|(?:chase\.com\/(?:atm|branch))|(?:bankofamerica\.com\/locator)|(?:mcdonalds\.com\/us\/en-us\/location)/i;

// PDF files — almost always government/directory documents in this domain
const PDF_RE = /\.pdf(?:[?#]|$)/i;

// Title patterns
// Examples that should match:
//   "2026 Best Places to Buy a House in Ozaukee County"
//   "Best Places to Live in Wisconsin"
//   "Top 10 Coffee Shops in Cedarburg"
//   "The 5 Best Pharmacies Near Mequon"
const TITLE_LISTICLE_RE =
  /^(?:\s*\d{4}\s+)?(?:the\s+)?(?:\d+\s+)?(?:best\s+places|top\s+\d+|the\s+best|\d+\s+best|best\s+\d+)\b/i;

// "[PDF] County LICENSED Child Care Directory"
const TITLE_PDF_RE = /^\s*\[pdf\]/i;

// "Directory of …", "County LICENSED Child Care Directory", "Listings for …"
const TITLE_DIRECTORY_RE =
  /\b(?:directory|listings?\s+for|county\s+licensed|find\s+a\s+(?:doctor|dentist|provider))\b/i;

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function matchesAggregator(host: string): string | null {
  for (const needle of AGGREGATOR_HOSTS) {
    if (host.includes(needle)) return needle;
  }
  return null;
}

export function filterResult(
  url: string | undefined,
  title: string | undefined,
): FilterResult {
  if (!url) return { ok: false, reason: "missing_url" };
  const host = hostOf(url);
  if (!host) return { ok: false, reason: "invalid_url" };

  if (PDF_RE.test(url)) return { ok: false, reason: "pdf_url" };

  if (GOVERNMENT_RE.test(url)) return { ok: false, reason: `government: ${host}` };

  const agg = matchesAggregator(host);
  if (agg) return { ok: false, reason: `aggregator: ${agg}` };

  if (CHAIN_LOCATOR_RE.test(url)) return { ok: false, reason: `chain_locator: ${host}` };

  const t = title ?? "";
  if (TITLE_PDF_RE.test(t)) return { ok: false, reason: "title: [PDF]" };
  if (TITLE_LISTICLE_RE.test(t)) return { ok: false, reason: "title: listicle" };
  if (TITLE_DIRECTORY_RE.test(t)) return { ok: false, reason: "title: directory" };

  return { ok: true, host };
}

// Build the 2-variant query set for a single category. The "best …" variant
// is what Google ranks aggregators for; the bare variant tends to surface the
// business's own site. We fire both and dedupe by URL.
export function queryVariants(term: string, locationLabel: string): string[] {
  const t = term.toLowerCase().trim();
  return [
    `best ${t} in ${locationLabel}`,
    `${t} ${locationLabel}`,
  ];
}
