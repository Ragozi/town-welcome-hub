// Server-only Firecrawl client. Reads FIRECRAWL_API_KEY from process.env at call time.
import { withDebugLog } from "@/lib/debug-log.server";

const BASE = "https://api.firecrawl.dev/v2";

function key() {
  const k = process.env.FIRECRAWL_API_KEY;
  if (!k) throw new Error("FIRECRAWL_API_KEY is not configured");
  return k;
}

export type FirecrawlSearchResult = {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
};

export async function firecrawlSearch(
  query: string,
  opts: { limit?: number; scrapeMarkdown?: boolean } = {},
): Promise<FirecrawlSearchResult[]> {
  return withDebugLog(
    { event_type: "scrape", function_name: "firecrawlSearch", input: { query, ...opts } },
    async () => {
      const body: Record<string, unknown> = {
        query,
        limit: opts.limit ?? 10,
      };
      if (opts.scrapeMarkdown) {
        body.scrapeOptions = { formats: ["markdown"], onlyMainContent: true };
      }

      const res = await fetch(`${BASE}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Firecrawl search failed [${res.status}]: ${text}`);
      }
      const json = (await res.json()) as {
        data?: { web?: FirecrawlSearchResult[] } | FirecrawlSearchResult[];
      };
      const data = json.data;
      if (Array.isArray(data)) return data;
      return data?.web ?? [];
    },
  );
}

// Firecrawl /v2/scrape with JSON/structured extraction. Pass a JSON Schema and
// Firecrawl's server-side LLM returns structured data under `data.json`.
// Used to pull a list of businesses out of a "best of" / listicle article.
// Cost: ~5 Firecrawl credits per call (1 scrape + JSON extraction surcharge).
export async function firecrawlScrapeJson<T>(
  url: string,
  schema: Record<string, unknown>,
  prompt?: string,
): Promise<T | null> {
  return withDebugLog(
    { event_type: "scrape", function_name: "firecrawlScrapeJson", input: { url, prompt } },
    async () => {
      const jsonFormat: Record<string, unknown> = { type: "json", schema };
      if (prompt) jsonFormat.prompt = prompt;

      const res = await fetch(`${BASE}/scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, formats: [jsonFormat], onlyMainContent: true }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Firecrawl scrape failed [${res.status}]: ${text}`);
      }
      const json = (await res.json()) as { data?: { json?: T } };
      return json.data?.json ?? null;
    },
  );
}
