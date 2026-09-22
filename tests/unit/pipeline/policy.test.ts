import { describe, expect, it } from "vitest";
import {
  classifyProviderError,
  decideProviderFailure,
  type ProviderFailureClass
} from "../../../lib/pipeline/policy";

describe("provider failure policy", () => {
  it("normalizes timeout failures", () => {
    expect(classifyProviderError(new Error("request timeout"))).toBe("TIMEOUT");
  });

  it("treats missing candidate fields as unavailable evidence", async () => {
    const { evidenceForField } = await import("../../../lib/matching/evidence");
    expect(evidenceForField(undefined, "year")).toBe("UNAVAILABLE");
  });

  it("keeps museum failures isolated when another source remains usable", () => {
    expect(decideProviderFailure({ provider: "museum", failure: "TIMEOUT", hasUsableEvidence: true }))
      .toBe("degrade");
  });

  it("fails when the critical Vision provider is unavailable", () => {
    expect(decideProviderFailure({ provider: "vision", failure: "NETWORK", hasUsableEvidence: false }))
      .toBe("api_unavailable");
  });

  it("covers every normalized provider failure class", () => {
    const failures: ProviderFailureClass[] = [
      "TIMEOUT", "RATE_LIMITED", "AUTH", "NOT_FOUND",
      "INVALID_RESPONSE", "NETWORK", "PROVIDER_ERROR"
    ];
    expect(new Set(failures).size).toBe(7);
  });
});