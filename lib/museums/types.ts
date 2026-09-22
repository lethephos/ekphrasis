export interface MuseumCandidate {
  institution: string;
  objectId: string;
  title: string;
  artist: string;
  year: string | number | null;
  medium: string | null;
  style: string | null;
  imageUrl: string | null;
  artworkUrl: string | null;
  license: 'verified' | 'unknown';
}
export interface MuseumAdapter {
  search(query: string): Promise<MuseumCandidate[]>;
}
