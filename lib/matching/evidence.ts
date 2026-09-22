import type { EvidenceState } from "../types";

export function evidenceForField(
  value: string | number | null | undefined,
  _field: string
): EvidenceState {
  return value === null || value === undefined || value === "" ? "UNAVAILABLE" : "MATCH";
}