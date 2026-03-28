// Bright Data SERP API client — replaces Brave Search via Snowflake Cortex

const BRIGHTDATA_SERP_URL = "https://api.brightdata.com/serp/req";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function getApiToken(): string {
  return process.env.BRIGHTDATA_API_TOKEN ?? "";
}

export function isBrightDataConfigured(): boolean {
  return !!getApiToken();
}

export async function brightDataSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const apiToken = getApiToken();
  if (!apiToken) {
    return [];
  }

  try {
    const response = await fetch(BRIGHTDATA_SERP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        query,
        search_engine: "google",
        num: maxResults,
        ...(process.env.BRIGHTDATA_ZONE ? { zone: process.env.BRIGHTDATA_ZONE } : {}),
      }),
    });

    if (!response.ok) {
      console.error(`Bright Data search failed (${response.status})`);
      return [];
    }

    const data = await response.json();

    // Bright Data SERP API returns organic results
    const organic = data.organic ?? data.results ?? [];
    return organic.slice(0, maxResults).map((r: Record<string, string>) => ({
      title: r.title ?? "",
      url: r.link ?? r.url ?? "",
      snippet: r.description ?? r.snippet ?? "",
    }));
  } catch (error) {
    console.error("Bright Data search error:", error);
    return [];
  }
}
