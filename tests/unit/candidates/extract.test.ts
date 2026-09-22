import { describe, expect, it } from "vitest";
import { extractSearchCandidates } from "../../../lib/candidates/extract";

describe("Vision candidate extraction", () => {
  it("extracts unique artwork-oriented text candidates without declaring identity", () => {
    const candidates = extractSearchCandidates({
      webDetection: {
        webEntities: [
          { description: "Vincent van Gogh" },
          { description: "The Starry Night" }
        ],
        bestGuessLabels: [{ label: "The Starry Night" }]
      }
    });
    expect(candidates).toEqual(["Vincent van Gogh", "The Starry Night"]);
  });
});