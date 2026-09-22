export interface VisionRequest {
  imageBytes: Uint8Array;
  signal: AbortSignal;
}
