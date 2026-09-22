import type { ArtworkCandidate, EvidenceState } from "../types";
export type ScoredCandidate = ArtworkCandidate & { score: number; strongPositiveCount: number; strongNegative: boolean };
const weight: Record<Exclude<EvidenceState, "UNAVAILABLE">, number> = { MATCH: 3, MISMATCH: -4 };
export function scoreCandidates(candidates: ArtworkCandidate[]): ScoredCandidate[] {
  return candidates.map(candidate => {
    const states = Object.values(candidate.evidence);
    const supportedSignals = Object.values(candidate.evidence_support ?? {}).flatMap(signals => signals ?? []);
    const strongPositiveCount = supportedSignals.length
      ? new Set(supportedSignals).size
      : states.filter(state => state === "MATCH").length;
    const strongNegative = states.includes("MISMATCH");
    const score = states.reduce((total, state) => state === "UNAVAILABLE" ? total : total + weight[state], 0);
    return { ...candidate, score, strongPositiveCount, strongNegative };
  });
}