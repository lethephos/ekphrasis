import type { IdentificationResult } from "../types";

export type CacheClass = "normal" | "degraded" | "uncacheable";

export function cacheClassFor(result: IdentificationResult): CacheClass {
  if (result.state === "ERROR") return "uncacheable";
  return result.degraded ? "degraded" : "normal";
}

export function ttlFor(cacheClass: Exclude<CacheClass, "uncacheable">): number {
  return cacheClass === "normal" ? 7 * 24 * 60 * 60 : 15 * 60;
}
