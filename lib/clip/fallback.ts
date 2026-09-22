import type { ArtworkCandidate } from "../types";
import type { ClipCandidateRef, ClipIndex, ClipEncoder, QdrantAdapter } from "./types";
export type { ClipIndex } from "./types";

export function shouldUseClipFallback(input: { sufficient: boolean }): boolean {
  return !input.sufficient;
}

export async function retrieveFallbackCandidates(
  image: Buffer,
  index: ClipIndex,
  encoder: ClipEncoder,
  qdrant: QdrantAdapter,
  hydrate: (refs: ClipCandidateRef[]) => Promise<ArtworkCandidate[]>
): Promise<ArtworkCandidate[]> {
  const vector = await encoder.embed(image);
  const refs = await qdrant.search(vector, index.version);
  return hydrate(refs);
}
