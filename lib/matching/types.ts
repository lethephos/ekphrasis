export type EvidenceState = 'MATCH' | 'MISMATCH' | 'UNAVAILABLE';
export interface ScoredCandidate {
  candidate: unknown;
  evidence: Record<string, EvidenceState>;
  score: number;
}
