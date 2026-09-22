import { createHmac } from "node:crypto";

export type RateLimitDecision = { allowed: boolean; retryAfterSeconds?: number };
export interface RateLimitStore {
  add(key: string, timestamp: number): Promise<void>;
  prune(key: string, before: number): Promise<void>;
  countSince(key: string, since: number): Promise<number>;
}
export type MemoryRateLimitStore = Map<string, number[]>;

export async function createRequestIdentity(address: string, secret: string): Promise<string> {
  return createHmac("sha256", secret).update(address).digest("hex");
}

export class SlidingWindowRateLimiter {
  constructor(
    private readonly store: RateLimitStore | MemoryRateLimitStore,
    private readonly now = () => Date.now()
  ) {}

  async check(identity: string): Promise<RateLimitDecision> {
    const minute = 60_000;
    const hour = 3_600_000;
    const now = this.now();

    if (this.store instanceof Map) {
      const values = this.store.get(identity) ?? [];
      const recent = values.filter(timestamp => timestamp > now - hour);
      const minuteCount = recent.filter(timestamp => timestamp > now - minute).length;
      if (minuteCount >= 5 || recent.length >= 30) return { allowed: false, retryAfterSeconds: 60 };
      recent.push(now);
      this.store.set(identity, recent);
      return { allowed: true };
    }

    await this.store.prune(identity, now - hour);
    if (await this.store.countSince(identity, now - minute) >= 5) return { allowed: false, retryAfterSeconds: 60 };
    if (await this.store.countSince(identity, now - hour) >= 30) return { allowed: false, retryAfterSeconds: 60 };
    await this.store.add(identity, now);
    return { allowed: true };
  }
}
