import { describe, expect, it } from "vitest";
import { ResilientResultCache } from "./runtime";
import type { IdentificationResult } from "../types";

const result = { state: "NO_MATCH" } as IdentificationResult;

describe("ResilientResultCache", () => {
  it("falls back when the primary cache fails", async () => {
    const fallback = new Map<string, IdentificationResult>();
    const cache = new ResilientResultCache(
      {
        async get() { throw new Error("redis unavailable"); },
        async set() { throw new Error("redis unavailable"); }
      },
      {
        async get(key) { return fallback.get(key) ?? null; },
        async set(key, value) { fallback.set(key, value); }
      }
    );

    expect(await cache.get("a")).toBeNull();
    await cache.set("a", result);
    expect(await cache.get("a")).toEqual(result);
  });
});
