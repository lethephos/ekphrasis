export type PublicStatus = 'match' | 'no_match' | 'error';
export type Confidence = 'low' | 'medium' | 'high';
export type EvidenceState = 'MATCH' | 'MISMATCH' | 'UNAVAILABLE';
export type StyleSource = 'museum' | 'wikipedia' | 'wikidata';
export type LicenseStatus = 'verified' | 'unknown';

export interface Evidence {
  state: EvidenceState;
  value?: string;
}

export interface Artwork {
  title: string;
  artist: string;
  year: string | null;
  medium: string | null;
  style: string | null;
  styleSource?: StyleSource;
  museum: string;
}

export interface Source {
  institution: string;
  objectId: string;
  artworkUrl: string;
  imageUrl: string;
  license: {
    status: LicenseStatus;
    details: string | null;
  };
}

export interface IdentificationResult {
  status: PublicStatus;
  confidence?: Confidence;
  artwork?: Artwork;
  source?: Source;
  context?: string | null;
  detail?: string | null;
  relatedReading?: Array<{
    title: string;
    url: string;
    source: 'wikipedia';
  }>;
  diagnostics?: {
    degraded?: boolean;
    unavailableSources?: string[];
    ambiguity?: boolean;
  };
}