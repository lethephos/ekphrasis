import { describe, expect, it } from "vitest";
import { createRequestIdentity, type MemoryRateLimitStore, SlidingWindowRateLimiter } from "../../../lib/rate-limit/rate-limit";

describe("request rate limiting", () => {
  it("creates a privacy-preserving identity from the trusted client address", async () => {
    const id = await createRequestIdentity("203.0.113.10", "test-secret");
    expect(id).toHaveLength(64);
    expect(id).not.toContain("203.0.113.10");
  });

  it("rejects after the configured minute threshold", async () => {
    const store: MemoryRateLimitStore = new Map();
    const limiter = new SlidingWindowRateLimiter(store, () => 1_000);
    for (let i = 0; i < 5; i++) expect((await limiter.check("id")).allowed).toBe(true);
    expect((await limiter.check("id")).allowed).toBe(false);
  });
});