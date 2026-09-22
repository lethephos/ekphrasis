import type { IdentificationResult } from "../types";
import type { ResultCache } from "./cache";

export class ResilientResultCache implements ResultCache {
  constructor(
    private readonly primary: ResultCache,
    private readonly fallback: ResultCache
  ) {}

  async get(hash: string): Promise<IdentificationResult | null> {
    try {
      return await this.primary.get(hash);
    } catch {
      return await this.fallback.get(hash);
    }
  }

  async set(hash: string, result: IdentificationResult): Promise<void> {
    try {
      await this.primary.set(hash, result);
    } catch {
      await this.fallback.set(hash, result);
    }
  }
}
