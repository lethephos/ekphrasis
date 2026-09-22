import { ProviderError } from "../errors";
import type { Fetcher } from "./types";

export async function requestJson<T>(
  fetcher: Fetcher,
  url: string,
  provider: string,
  timeoutMs = 6_000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) {
      const failure =
        response.status === 429 ? "RATE_LIMITED" :
        response.status === 401 || response.status === 403 ? "AUTH" :
        response.status === 404 ? "NOT_FOUND" :
        "PROVIDER_ERROR";
      throw new ProviderError(provider, failure, `Museum provider returned ${response.status}.`);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ProviderError(provider, "TIMEOUT", "Museum request timed out.");
    }
    throw new ProviderError(provider, "NETWORK", "Museum request failed.");
  } finally {
    clearTimeout(timer);
  }
}
