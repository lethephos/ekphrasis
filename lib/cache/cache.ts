import type { IdentificationResult } from "../types";

export interface ResultCache {
  get(hash: string): Promise<IdentificationResult | null>;
  set(hash: string, result: IdentificationResult): Promise<void>;
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}