export type ClipIndex = { version: string };
export type ClipCandidateRef = { artworkId: string; score: number };
export interface ClipEncoder { embed(image: Buffer): Promise<number[]>; }
export interface QdrantAdapter { search(vector: number[], indexVersion: string): Promise<ClipCandidateRef[]>; }