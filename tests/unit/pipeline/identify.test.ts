import { describe, expect, it } from "vitest";
import { identifyImage } from "../../../lib/pipeline/identify";

describe("identification pipeline", () => {
  it("returns a cached result without invoking providers", async () => {
    const cached = { state: "NO_MATCH", reason: "insufficient_evidence", degraded: false, unavailable_sources: [] } as const;
    const result = await identifyImage(
      { file: new File([new Uint8Array([1])], "x.jpg", { type: "image/jpeg" }), address: "test" },
      {
        cache: { get: async () => cached, set: async () => {} },
        limiter: { check: async () => ({ allowed: true }) },
        validate: async () => { throw new Error("should not run"); }
      }
    );
    expect(result).toEqual(cached);
  });
});