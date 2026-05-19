import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRateLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Rate limiting is disabled when Redis env vars are missing.
    // This keeps local/dev builds green without extra infra.
    return null;
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(20, "10 s"),
    analytics: true,
    prefix: "cortex:chat",
  });
}

const ratelimit = createRateLimiter();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

export async function checkRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  if (!ratelimit) return { ok: true };

  const { success, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return { ok: false, retryAfter: Math.ceil((reset - Date.now()) / 1000) };
  }

  return { ok: true };
}
