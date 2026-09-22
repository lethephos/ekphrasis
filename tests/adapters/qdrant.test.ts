import { describe, expect, it } from "vitest";
import { QdrantRuntimeAdapter } from "../../lib/clip/qdrant";

describe("Qdrant adapter", () => {
  it("returns only candidates from the requested index version", async () => {
    const client = {
      query: async () => ({
        points: [
          { score: 0.91, payload: { index_version: "v1", artwork_id: "a", candidate: {
            source: { id: "met", name: "The Met", image_url: null, url: null },
            artwork: { title: "A", artist: "B", year: "1900", medium: "Oil", style: null },
            evidence: { vision_text_match: "UNAVAILABLE", artist_match: "UNAVAILABLE", title_match: "UNAVAILABLE", date_match: "UNAVAILABLE", medium_match: "UNAVAILABLE", image_similarity: "UNAVAILABLE" }
          } } },
          { score: 0.88, payload: { index_version: "old", artwork_id: "b" } }
        ]
      })
    };
    const adapter = new QdrantRuntimeAdapter("artworks", client as never);
    await expect(adapter.search([0.1, 0.2], "v1")).resolves.toHaveLength(1);
  });
});
