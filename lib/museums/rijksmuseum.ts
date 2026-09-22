import type { ArtworkCandidate } from "../types";
import type { Fetcher, MuseumAdapter } from "./types";
import { ProviderError } from "../errors";

export class RijksmuseumAdapter implements MuseumAdapter {
  id = "rijksmuseum";
  name = "Rijksmuseum";
  constructor(private readonly fetcher: Fetcher = fetch, private readonly apiKey = process.env.RIJKSMUSEUM_API_KEY ?? "") {}
  async search(query: string): Promise<ArtworkCandidate[]> {
    if (!this.apiKey) throw new ProviderError(this.id, "AUTH", "Rijksmuseum API key is not configured.");
    const response = await this.fetcher(`https://www.rijksmuseum.nl/api/en/collection?key=${encodeURIComponent(this.apiKey)}&q=${encodeURIComponent(query)}&ps=5&imgonly=true`);
    if (!response.ok) throw new ProviderError(this.id, response.status === 429 ? "RATE_LIMITED" : "PROVIDER_ERROR", "Rijksmuseum request failed.");
    const json = await response.json() as { artObjects?: Array<Record<string, unknown>> };
    return (json.artObjects ?? []).map(record => {
      const webImage = typeof record.webImage === "object" && record.webImage ? record.webImage as Record<string, unknown> : {};
      return {
        source: { id: this.id, name: this.name, image_url: stringOrNull(webImage.url), url: stringOrNull(record.links && typeof record.links === "object" ? (record.links as Record<string, unknown>).web : null) },
        artwork: { title: stringOrNull(record.title), artist: stringOrNull(record.principalOrFirstMaker), year: null, medium: null, style: null },
        evidence: emptyEvidence()
      };
    });
  }
}
function stringOrNull(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }
function emptyEvidence() { return { vision_text_match: "UNAVAILABLE", artist_match: "UNAVAILABLE", title_match: "UNAVAILABLE", date_match: "UNAVAILABLE", medium_match: "UNAVAILABLE", image_similarity: "UNAVAILABLE" } as const; }