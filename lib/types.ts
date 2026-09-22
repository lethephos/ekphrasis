export type EvidenceState = "MATCH" | "MISMATCH" | "UNAVAILABLE";
export type PublicState = "MATCH" | "NO_MATCH" | "ERROR";
export type Confidence = "high" | "medium" | "low";
export type ProviderFailureClass =
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "AUTH"
  | "NOT_FOUND"
  | "INVALID_RESPONSE"
  | "NETWORK"
  | "PROVIDER_ERROR";

export type Evidence = {
  vision_text_match: EvidenceState;
  artist_match: EvidenceState;
  title_match: EvidenceState;
  date_match: EvidenceState;
  medium_match: EvidenceState;
  image_similarity: EvidenceState;
};

export type ArtworkCandidate = {
  source: {
    id: string;
    name: string;
    image_url: string | null;
    url: string | null;
  };
  artwork: {
    title: string | null;
    artist: string | null;
    year: string | null;
    medium: string | null;
    style: string | null;
  };
  evidence: Evidence;
};

export type IdentificationResult =
  | {
      state: "MATCH";
      confidence: Confidence;
      artwork: ArtworkCandidate["artwork"];
      source: ArtworkCandidate["source"];
      context: string | null;
      detail: string | null;
      degraded: boolean;
      unavailable_sources: string[];
    }
  | {
      state: "NO_MATCH";
      reason: "insufficient_evidence";
      degraded: boolean;
      unavailable_sources: string[];
    }
  | {
      state: "ERROR";
      error:
        | "INVALID_IMAGE"
        | "API_UNAVAILABLE"
        | "PROCESSING_FAILED"
        | "UNSUPPORTED_INPUT";
    };