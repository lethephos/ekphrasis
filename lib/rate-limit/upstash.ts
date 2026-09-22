import { Redis } from "@upstash/redis";
import type { RateLimitStore } from "./rate-limit";

type Entry = { timestamp: number };

export class UpstashRateLimitStore implements RateLimitStore {
  constructor(private readonly redis = Redis.fromEnv()) {}

  async add(key: string, timestamp: number): Promise<void> {
    await this.redis.zadd(`ekphrasis:rate:${key}`, { score: timestamp, member: `${timestamp}:${Math.random()}` });
    await this.redis.expire(`ekphrasis:rate:${key}`, 3600);
  }

  async prune(key: string, before: number): Promise<void> {
    await this.redis.zremrangebyscore(`ekphrasis:rate:${key}`, 0, before);
  }

  async count(key: string): Promise<number> {
    return await this.redis.zcard(`ekphrasis:rate:${key}`);
  }
}