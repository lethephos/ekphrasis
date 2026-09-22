import { createHash } from "node:crypto";
import type { IdentificationResult } from "../types";

export interface ResultCache {
  get(hash: string): Promise<IdentificationResult | null>;
  set(hash: string, result: IdentificationResult): Promise<void>;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
