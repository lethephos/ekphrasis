import { describe, expect, it, vi } from "vitest";
import { MetAdapter } from "../../lib/museums/met";
import { ArticAdapter } from "../../lib/museums/artic";

describe("museum adapters", () => {
  it("maps a Met record while preserving absent fields as null", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ objectIDs: [1] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        objectID: 1,
        title: "Starry Night",
        artistDisplayName: "Vincent van Gogh",
        objectDate: "1889",
        medium: "Oil on canvas",
        primaryImage: "https://example.com/met.jpg"
      })));
    const adapter = new MetAdapter(fetcher as typeof fetch);
    const results = await adapter.search("Starry Night");
    expect(results[0].artwork.style).toBeNull();
    expect(results[0].artwork.year).toBe("1889");
  });

  it("prefers AIC style_title when present", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{
        id: 10,
        title: "Example",
        artist_display: "Artist",
        date_display: "1900",
        medium_display: "Oil",
        style_title: "Impressionism",
        image_id: "abc"
      }]
    })));
    const adapter = new ArticAdapter(fetcher as typeof fetch);
    const result = await adapter.search("Example");
    expect(result[0].artwork.style).toBe("Impressionism");
  });
});