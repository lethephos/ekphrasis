export interface VisionCandidate {
  queries: string[];
  references: Array<{ url: string; title: string | null }>;
}
