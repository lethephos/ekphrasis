export type { ProviderFailureClass } from "../types";
import type { ProviderFailureClass } from "../types";

export type FailureDecision = "continue" | "degrade" | "fallback" | "api_unavailable";

const failureMatchers: Array<[ProviderFailureClass, RegExp]> = [
  ["TIMEOUT", /timeout|timed out/i],
  ["RATE_LIMITED", /rate.?limit|429/i],
  ["AUTH", /unauthori[sz]ed|forbidden|401|403/i],
  ["NOT_FOUND", /not found|404/i],
  ["INVALID_RESPONSE", /invalid response|malformed|parse/i],
  ["NETWORK", /network|socket|dns|fetch failed/i]
];

export function classifyProviderError(error: unknown): ProviderFailureClass {
  if (error instanceof Error) {
    const match = failureMatchers.find(([, pattern]) => pattern.test(error.message));
    if (match) return match[0];
  }
  return "PROVIDER_ERROR";
}

export function decideProviderFailure(context: {
  provider: "vision" | "museum" | "clip" | "enrichment";
  failure: ProviderFailureClass;
  hasUsableEvidence: boolean;
}): FailureDecision {
  if (context.provider === "vision") return "api_unavailable";
  if (context.provider === "museum") return context.hasUsableEvidence ? "degrade" : "fallback";
  if (context.provider === "clip") return context.hasUsableEvidence ? "degrade" : "fallback";
  return "continue";
}