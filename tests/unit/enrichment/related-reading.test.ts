import { describe, expect, it } from "vitest";
import { extractRelatedReading } from "../../../lib/enrichment/related-reading";

describe("related reading", () => {
  it("returns at most three qualifying external links", () => {
    const links = extractRelatedReading([
      { title: "Museum", url: "https://example.org/museum" },
      { title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Example" },
      { title: "Instagram", url: "https://instagram.com/example" },
      { title: "Paper", url: "https://example.edu/paper" },
      { title: "More", url: "https://example.org/more" }
    ]);
    expect(links).toHaveLength(3);
    expect(links.some(link => link.url.includes("instagram"))).toBe(false);
  });
});