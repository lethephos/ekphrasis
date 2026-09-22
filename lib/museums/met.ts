import type { ArtworkCandidate } from "../types";
import type { Fetcher, MuseumAdapter } from "./types";
import { ProviderError } from "../errors";

export class MetAdapter implements MuseumAdapter {
  id = "met";
  name = "The Metropolitan Museum of Art";
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async search(query: string): Promise<ArtworkCandidate[]> {
    const search = await requestJson<{ objectIDs?: number[] }>(
      this.fetcher,
      `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`,
      this.id
    );
    const ids = (search.objectIDs ?? []).slice(0, 5);
    const details = await Promise.all(ids.map(id =>
      requestJson<Record<string, unknown>>(
        this.fetcher,
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
        this.id
      )
    ));
    return details.map(record => ({
      source: { id: this.id, name: this.name, image_url: stringOrNull(record.primaryImage), url: stringOrNull(record.objectURL) },
      artwork: {
        title: stringOrNull(record.title),
        artist: stringOrNull(record.artistDisplayName),
        year: stringOrNull(record.objectDate),
        medium: stringOrNull(record.medium),
        style: null
      },
      evidence: emptyEvidence()
    }));
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
function emptyEvidence() {
  return { vision_text_match: "UNAVAILABLE", artist_match: "UNAVAILABLE", title_match: "UNAVAILABLE", date_match: "UNAVAILABLE", medium_match: "UNAVAILABLE", image_similarity: "UNAVAILABLE" } as const;
}
async function requestJson<T>(fetcher: Fetcher, url: string, provider: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new ProviderError(provider, response.status === 429 ? "RATE_LIMITED" : response.status === 404 ? "NOT_FOUND" : "PROVIDER_ERROR", `Museum provider returned ${response.status}.`);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new ProviderError(provider, "TIMEOUT", "Museum request timed out.");
    throw new ProviderError(provider, "NETWORK", "Museum request failed.");
  } finally {
    clearTimeout(timer);
  }
}