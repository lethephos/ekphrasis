import { describe, expect, it } from "vitest";
import { buildEvidence } from "../../lib/matching/evidence";
import { selectCanonicalCandidate } from "../../lib/matching/select";
import { scoreCandidates } from "../../lib/matching/score";

const base = (overrides: Record<string, unknown> = {}) => ({
  source: { id: "met", name: "Met", image_url: null, url: null },
  artwork: { title: "The Starry Night", artist: "Vincent van Gogh", year: "1889", medium: "Oil on canvas", style: null },
  evidence: { vision_text_match: "MATCH", artist_match: "MATCH", title_match: "MATCH", date_match: "MATCH", medium_match: "MATCH", image_similarity: "UNAVAILABLE" },
  ...overrides
});

describe("deterministic matching", () => {
  it("treats an absent year as neutral", () => {
    const evidence = buildEvidence(
      { title: "The Starry Night", artist: "Vincent van Gogh", year: null, medium: "Oil on canvas" },
      { title: "The Starry Night", artist: "Vincent van Gogh", year: "1889", medium: "Oil on canvas" }
    );
    expect(evidence.date_match).toBe("UNAVAILABLE");
  });

  it("selects the same canonical source regardless of arrival order", () => {
    const a = base();
    const b = base({ source: { id: "aic", name: "AIC", image_url: null, url: null } });
    expect(selectCanonicalCandidate(scoreCandidates([a, b]), ["met", "aic"]).candidate?.source.id)
      .toBe(selectCanonicalCandidate(scoreCandidates([b, a]), ["met", "aic"]).candidate?.source.id);
  });
});