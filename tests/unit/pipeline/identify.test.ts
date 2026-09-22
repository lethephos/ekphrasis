import { describe, expect, it } from "vitest";
import type { IdentificationResult } from "../../../lib/types";
import { evidenceCandidates, identifyImage } from "../../../lib/pipeline/identify";

describe("identification pipeline", () => {
  it("maps independent Vision text candidates to title and artist evidence without false negatives", () => {
    const [candidate] = evidenceCandidates([{
      source: { id: "met", name: "The Met", image_url: null, url: null },
      artwork: { title: "The Starry Night", artist: "Vincent van Gogh", year: "1889", medium: "Oil on canvas", style: null },
      evidence: {
        vision_text_match: "UNAVAILABLE",
        artist_match: "UNAVAILABLE",
        title_match: "UNAVAILABLE",
        date_match: "UNAVAILABLE",
        medium_match: "UNAVAILABLE",
        image_similarity: "UNAVAILABLE"
      }
    }], ["The Starry Night", "Vincent van Gogh"]);
    expect(candidate.evidence.title_match).toBe("MATCH");
    expect(candidate.evidence.artist_match).toBe("MATCH");
    expect(candidate.evidence.date_match).toBe("UNAVAILABLE");
    expect(candidate.evidence.medium_match).toBe("UNAVAILABLE");
  });

  it("rejects oversized uploads before reading or hashing them", async () => {
    const result = await identifyImage(
      { file: new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" }), address: "test" },
      {
        cache: { get: async () => { throw new Error("cache should not run"); }, set: async () => {} },
        limiter: { check: async () => ({ allowed: true }) }
      }
    );
    expect(result).toEqual({ state: "ERROR", error: "UNSUPPORTED_INPUT" });
  });

  it("continues with recognition when the cache backend is unavailable", async () => {
    const result = await identifyImage(
      { file: new File([new Uint8Array([1])], "x.jpg", { type: "image/jpeg" }), address: "test" },
      {
        cache: {
          get: async () => { throw new Error("cache unavailable"); },
          set: async () => { throw new Error("cache unavailable"); }
        },
        limiter: { check: async () => ({ allowed: true }) },
        validate: async () => ({ bytes: Buffer.from("image"), format: "jpeg", width: 1, height: 1 }),
        normalize: async upload => ({ bytes: upload.bytes, mimeType: "image/jpeg", width: 1, height: 1 }),
        vision: { detect: async () => ({ webDetection: { webEntities: [{ description: "Example" }, { description: "Artist" }] } }) },
        museums: [{
          id: "met",
          name: "The Met",
          search: async () => []
        }],
        clip: {
          index: { version: "v1" },
          encoder: { embed: async () => [0.1, 0.2] },
          qdrant: { search: async () => [{ artworkId: "met:123", score: 0.99 }] },
          hydrate: async refs => {
            expect(refs.map(ref => ref.artworkId)).toEqual(["met:123"]);
            return [{
              source: { id: "met", name: "The Met", image_url: null, url: null },
              artwork: { title: "Example", artist: "Artist", year: null, medium: null, style: null },
              evidence: {
                vision_text_match: "UNAVAILABLE",
                artist_match: "UNAVAILABLE",
                title_match: "UNAVAILABLE",
                date_match: "UNAVAILABLE",
                medium_match: "UNAVAILABLE",
                image_similarity: "UNAVAILABLE"
              }
            }];
          }
        }
      }
    );
    expect(result.state).toBe("MATCH");
  });

  it("returns a cached result without invoking providers", async () => {
    const cached: IdentificationResult = { state: "NO_MATCH", reason: "insufficient_evidence", degraded: false, unavailable_sources: [] };
    const result = await identifyImage(
      { file: new File([new Uint8Array([1])], "x.jpg", { type: "image/jpeg" }), address: "test" },
      {
        cache: { get: async () => cached, set: async () => {} },
        limiter: { check: async () => ({ allowed: true }) }
      }
    );
    expect(result).toEqual(cached);
  });
});
