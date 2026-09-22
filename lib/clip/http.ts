import { ProviderError } from "../errors";
import type { ClipEncoder } from "./types";

export class HttpClipEncoder implements ClipEncoder {
  constructor(
    private readonly endpoint = process.env.CLIP_EMBEDDING_URL ?? "",
    private readonly timeoutMs = 7_500
  ) {}

  async embed(image: Buffer): Promise<number[]> {
    if (!this.endpoint) throw new ProviderError("clip", "PROVIDER_ERROR", "CLIP embedding service is not configured.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image_base64: image.toString("base64") }),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new ProviderError(
          "clip",
          response.status === 429 ? "RATE_LIMITED" : response.status === 401 || response.status === 403 ? "AUTH" : "PROVIDER_ERROR",
          "CLIP embedding service failed."
        );
      }
      const payload = await response.json() as { embedding?: unknown };
      if (!Array.isArray(payload.embedding) || payload.embedding.length === 0 || !payload.embedding.every(value => typeof value === "number" && Number.isFinite(value))) {
        throw new ProviderError("clip", "INVALID_RESPONSE", "CLIP embedding service returned an invalid vector.");
      }
      return payload.embedding;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ProviderError("clip", "TIMEOUT", "CLIP embedding service timed out.");
      }
      throw new ProviderError("clip", "NETWORK", "CLIP embedding service failed.");
    } finally {
      clearTimeout(timer);
    }
  }
}
