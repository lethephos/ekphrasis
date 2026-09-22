import vision from "@google-cloud/vision";
import type { VisionDetection } from "../candidates/extract";
import { ProviderError } from "../errors";

export interface VisionAdapter {
  detect(image: Buffer): Promise<VisionDetection>;
}

export class GoogleVisionAdapter implements VisionAdapter {
  private readonly client: vision.ImageAnnotatorClient;

  constructor(client = new vision.ImageAnnotatorClient()) {
    this.client = client;
  }

  async detect(image: Buffer): Promise<VisionDetection> {
    const request = { image: { content: image } };
    const timeout = 7_500;

    try {
      const result = await Promise.race([
        this.client.webDetection(request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new ProviderError("vision", "TIMEOUT", "Vision request timed out.")), timeout)
        )
      ]);

      const response = result[0] as {
        webDetection?: {
          webEntities?: Array<{ description?: string | null }>;
          bestGuessLabels?: Array<{ label?: string | null }>;
        };
      };
      return { webDetection: response.webDetection };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError("vision", "PROVIDER_ERROR", "Vision request failed.");
    }
  }
}