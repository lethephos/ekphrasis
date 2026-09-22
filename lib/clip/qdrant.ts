import { QdrantClient } from "@qdrant/js-client-rest";
import type { ClipCandidateRef, QdrantAdapter } from "./types";
import { ProviderError } from "../errors";

export class QdrantRuntimeAdapter implements QdrantAdapter {
  private readonly client: QdrantClient;
  constructor(
    private readonly collection = process.env.QDRANT_COLLECTION ?? "ekphrasis-artworks",
    client = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY })
  ) { this.client = client; }

  async search(vector: number[], indexVersion: string): Promise<ClipCandidateRef[]> {
    try {
      const result = await this.client.query(this.collection, {
        query: vector,
        limit: 10,
        with_payload: true
      });
      return result.points.flatMap((point: { score?: number; payload?: Record<string, unknown> | null }) => {
        const payload = point.payload;
        if (!payload || payload.index_version !== indexVersion || typeof payload.artwork_id !== "string") return [];
        return [{
          artworkId: payload.artwork_id,
          score: typeof point.score === "number" ? point.score : 0,
          candidate: payload.candidate as ClipCandidateRef["candidate"]
        }];
      });
    } catch {
      throw new ProviderError("qdrant", "PROVIDER_ERROR", "Qdrant fallback search failed.");
    }
  }
}
