import { describe, expect, it } from "vitest";
import { cacheClassFor } from "../../lib/pipeline/cache-policy";
import { selectCanonicalCandidate } from "../../lib/matching/select";
import { scoreCandidates } from "../../lib/matching/score";

describe("MVP verification invariants", () => {
  it("never caches API unavailable", () => {
    expect(cacheClassFor({ state: "ERROR", error: "API_UNAVAILABLE" })).toBe("uncacheable");
  });

  it("is deterministic under candidate arrival reordering", () => {
    const candidate = (id: string) => ({
      source: { id, name: id, image_url: null, url: null },
      artwork: { title: "A", artist: "B", year: "1900", medium: "Oil", style: null },
      evidence: { vision_text_match: "UNAVAILABLE", artist_match: "MATCH", title_match: "MATCH", date_match: "UNAVAILABLE", medium_match: "UNAVAILABLE", image_similarity: "UNAVAILABLE" }
    } as const);
    const first = selectCanonicalCandidate(scoreCandidates([candidate("aic"), candidate("met")]), ["met", "aic"]);
    const second = selectCanonicalCandidate(scoreCandidates([candidate("met"), candidate("aic")]), ["met", "aic"]);
    expect(first.candidate?.source.id).toBe(second.candidate?.source.id);
  });
});