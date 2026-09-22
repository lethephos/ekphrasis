import { describe, expect, it } from "vitest";
import { GoogleVisionAdapter } from "../../lib/vision/google";

describe("Google Vision adapter", () => {
  it("maps web detection entities and labels", async () => {
    const client = {
      webDetection: async () => [{
        webDetection: {
          webEntities: [{ description: "Vincent van Gogh" }],
          bestGuessLabels: [{ label: "The Starry Night" }]
        }
      }]
    };
    const adapter = new GoogleVisionAdapter(client as never);
    await expect(adapter.detect(Buffer.from("image"))).resolves.toEqual({
      webDetection: {
        webEntities: [{ description: "Vincent van Gogh" }],
        bestGuessLabels: [{ label: "The Starry Night" }]
      }
    });
  });
});
