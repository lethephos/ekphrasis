import { describe, expect, it, afterEach } from "vitest";
import { getRateLimitSecret } from "./secret";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("getRateLimitSecret", () => {
  it("falls back to HF_TOKEN when RATE_LIMIT_HMAC_SECRET is missing", () => {
    delete process.env.RATE_LIMIT_HMAC_SECRET;
    process.env.HF_TOKEN = "hf-test-secret";

    expect(getRateLimitSecret()).toBe("hf-test-secret");
  });
});
