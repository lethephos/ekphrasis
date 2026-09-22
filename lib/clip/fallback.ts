import type { ArtworkCandidate } from "../types";
import type { ClipIndex, ClipEncoder, QdrantAdapter } from "./types";

export function shouldUseClipFallback(input: { sufficient: boolean }): boolean {
  return !input.sufficient;
}

export async function retrieveFallbackCandidates(
  image: Buffer,
  index: ClipIndex,
  encoder: ClipEncoder,
  qdrant: QdrantAdapter,
  hydrate: (refs: string[]) => Promise<ArtworkCandidate[]>
): Promise<ArtworkCandidate[]> {
  const vector = await encoder.embed(image);
  const refs = await qdrant.search(vector, index.version);
  return hydrate(refs.map(ref => ref.artworkId));
}