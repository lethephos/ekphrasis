import { describe, expect, it } from "vitest";
import { shouldUseClipFallback, type ClipIndex } from "../../lib/clip/fallback";

describe("CLIP fallback", () => {
  it("runs only when primary evidence is insufficient", () => {
    expect(shouldUseClipFallback({ sufficient: false })).toBe(true);
    expect(shouldUseClipFallback({ sufficient: true })).toBe(false);
  });

  it("carries an explicit index version", () => {
    const index: ClipIndex = { version: "2026-09-22-v1" };
    expect(index.version).toBe("2026-09-22-v1");
  });
});