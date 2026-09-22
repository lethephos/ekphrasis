import type { ArtworkCandidate, Confidence } from "../types";
import type { ScoredCandidate } from "./score";
export type SelectionResult = { candidate: ScoredCandidate | null; confidence: Confidence | null; ambiguous: boolean };
const metadataFields = ["title", "artist", "year", "medium"] as const;
function populated(candidate: ArtworkCandidate): number { return metadataFields.filter(field => Boolean(candidate.artwork[field])).length; }
export function selectCanonicalCandidate(candidates: ScoredCandidate[], sourcePriority: string[]): SelectionResult {
  const eligible = candidates.filter(candidate => candidate.strongPositiveCount >= 2 && !candidate.strongNegative);
  if (!eligible.length) return { candidate: null, confidence: null, ambiguous: false };
  const ordered = [...eligible].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const populatedDiff = populated(b) - populated(a);
    if (populatedDiff) return populatedDiff;
    const ai = sourcePriority.indexOf(a.source.id); const bi = sourcePriority.indexOf(b.source.id);
    const priorityDiff = (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
    if (priorityDiff) return priorityDiff;
    return a.source.id.localeCompare(b.source.id);
  });
  const top = ordered[0];
  const ambiguous = ordered.length > 1 && top.score === ordered[1].score && top.source.id !== ordered[1].source.id;
  return { candidate: top, confidence: ambiguous ? "medium" : top.score >= 9 ? "high" : "medium", ambiguous };
}