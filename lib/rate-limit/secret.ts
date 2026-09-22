export function getRateLimitSecret(): string | undefined {
  return process.env.RATE_LIMIT_HMAC_SECRET?.trim() || process.env.HF_TOKEN?.trim();
}
