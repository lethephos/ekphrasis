import { ProviderError } from "../errors";
export type WikipediaArticle = { extract?: string; content_urls?: { desktop?: { page?: string } }; externallinks?: string[] };
export async function fetchWikipedia(title: string): Promise<WikipediaArticle | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new ProviderError("wikipedia", "PROVIDER_ERROR", "Wikipedia request failed.");
    return await response.json() as WikipediaArticle;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("wikipedia", "NETWORK", "Wikipedia request failed.");
  } finally { clearTimeout(timer); }
}