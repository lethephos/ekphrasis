import type { ArtworkCandidate } from "../types";

export interface MuseumAdapter {
  id: string;
  name: string;
  search(query: string): Promise<ArtworkCandidate[]>;
  getById?(id: string): Promise<ArtworkCandidate | null>;
}

export type Fetcher = typeof fetch;