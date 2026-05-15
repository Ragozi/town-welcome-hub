// Server-only Firecrawl client. Reads FIRECRAWL_API_KEY from process.env at call time.

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
}
