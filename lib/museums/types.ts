import type { ArtworkCandidate } from "../types";

export interface MuseumAdapter {
  id: string;
  name: string;
  search(query: string): Promise<ArtworkCandidate[]>;
}

export type Fetcher = typeof fetch;