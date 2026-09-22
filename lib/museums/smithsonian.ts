import type { ArtworkCandidate } from "../types";
import type { Fetcher, MuseumAdapter } from "./types";
import { ProviderError } from "../errors";
import { requestJson } from "./request";

export class SmithsonianAdapter implements MuseumAdapter {
  id = "smithsonian";
  name = "Smithsonian Open Access";
  constructor(private readonly fetcher: Fetcher = fetch, private readonly apiKey = process.env.SMITHSONIAN_API_KEY ?? "") {}
  async search(query: string): Promise<ArtworkCandidate[]> {
    if (!this.apiKey) throw new ProviderError(this.id, "AUTH", "Smithsonian API key is not configured.");
    const json = await requestJson<{ response?: { rows?: Array<Record<string, unknown>> } }>(
      this.fetcher,
      `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(this.apiKey)}&rows=5`,
      this.id
    );
    return (json.response?.rows ?? []).map(record => ({
      source: { id: this.id, name: this.name, image_url: extractImage(record), url: stringOrNull(record.url) },
      artwork: { title: stringOrNull(record.title), artist: null, year: null, medium: null, style: null },
      evidence: emptyEvidence()
    }));
  }
}
function extractImage(record: Record<string, unknown>): string | null {
  const content = record.content;
  if (Array.isArray(content)) {
    const first = content.find(item => typeof item === "object" && item && typeof (item as Record<string, unknown>).online_text === "string");
    if (first && typeof (first as Record<string, unknown>).online_text === "string") return (first as Record<string, unknown>).online_text as string;
  }
  return null;
}
function stringOrNull(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }
function emptyEvidence() { return { vision_text_match: "UNAVAILABLE", artist_match: "UNAVAILABLE", title_match: "UNAVAILABLE", date_match: "UNAVAILABLE", medium_match: "UNAVAILABLE", image_similarity: "UNAVAILABLE" } as const; }
