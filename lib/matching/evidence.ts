import type { ArtworkCandidate, Evidence, EvidenceState } from "../types";
import { equivalentDate, equivalentText } from "./normalize";

export function evidenceForField(value: string | number | null | undefined, _field: string): EvidenceState {
  return value === null || value === undefined || value === "" ? "UNAVAILABLE" : "MATCH";
}

export function buildEvidence(candidate: Pick<ArtworkCandidate["artwork"], "title" | "artist" | "year" | "medium">, extracted: Pick<ArtworkCandidate["artwork"], "title" | "artist" | "year" | "medium">): Evidence {
  const compare = (a: string | null, b: string | null, date = false): EvidenceState => {
    if (!a || !b) return "UNAVAILABLE";
    return (date ? equivalentDate(a, b) : equivalentText(a, b)) ? "MATCH" : "MISMATCH";
  };
  return {
    vision_text_match: "UNAVAILABLE",
    title_match: compare(candidate.title, extracted.title),
    artist_match: compare(candidate.artist, extracted.artist),
    date_match: compare(candidate.year, extracted.year, true),
    medium_match: compare(candidate.medium, extracted.medium),
    image_similarity: "UNAVAILABLE"
  };
}