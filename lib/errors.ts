import type { ProviderFailureClass } from "./types";

export class InputError extends Error {
  constructor(
    public readonly code: "INVALID_IMAGE" | "UNSUPPORTED_INPUT",
    message: string
  ) {
    super(message);
    this.name = "InputError";
  }
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly failure: ProviderFailureClass,
    message: string
  ) {
    super(message);
    this.name = "ProviderError";
  }
}