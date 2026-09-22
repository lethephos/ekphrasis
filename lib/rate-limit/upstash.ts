import { Redis } from "@upstash/redis";
import type { RateLimitStore } from "./rate-limit";

export class UpstashRateLimitStore implements RateLimitStore {
  constructor(private readonly redis = Redis.fromEnv()) {}
  private key(key: string) { return `ekphrasis:rate:${key}`; }
  async add(key: string, timestamp: number): Promise<void> {
    await this.redis.zadd(this.key(key), { score: timestamp, member: `${timestamp}:${crypto.randomUUID()}` });
    await this.redis.expire(this.key(key), 3600);
  }
  async prune(key: string, before: number): Promise<void> {
    await this.redis.zremrangebyscore(this.key(key), 0, before);
  }
  async countSince(key: string, since: number): Promise<number> {
    return await this.redis.zcount(this.key(key), since, Date.now());
  }
}