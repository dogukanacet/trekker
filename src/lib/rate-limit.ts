import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const RULES = {
  loginAccountIp: { requests: 10, window: "15 m" }, // one person on one device
  loginAccount: { requests: 20, window: "15 m" }, // caps distributed guessing against one account
  loginIp: { requests: 30, window: "15 m" }, // one source trying many accounts
  forgotEmail: { requests: 3, window: "1 h" },
  forgotIp: { requests: 10, window: "1 h" },
  registerIp: { requests: 5, window: "1 h" },
  resetIp: { requests: 10, window: "15 m" },
} as const;

export type RuleName = keyof typeof RULES;

let redis: Redis | null | undefined;
const limiters = new Map<RuleName, Ratelimit>();

function getRedis() {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  if (!redis && process.env.NODE_ENV === "production") {
    console.error("[rate-limit] Upstash is not configured: limits are NOT enforced");
  }
  return redis;
}

function getLimiter(rule: RuleName, client: Redis) {
  let limiter = limiters.get(rule);
  if (!limiter) {
    const { requests, window } = RULES[rule];
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `rl:${rule}`,
    });
    limiters.set(rule, limiter);
  }
  return limiter;
}

// True when the request may proceed.
async function allow(rule: RuleName, identifier: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;
  try {
    const result = await getLimiter(rule, client).limit(identifier);
    return result.success;
  } catch (error) {
    // Fail open: an Upstash outage must not lock everyone out of the app.
    console.error("[rate-limit] check failed, allowing the request", error);
    return true;
  }
}

// Runs all checks in parallel; entries with a null identifier (e.g. unknown IP) are skipped.
export async function passesRateLimits(checks: Array<[RuleName, string | null]>) {
  const results = await Promise.all(
    checks.flatMap(([rule, id]) => (id === null ? [] : [allow(rule, id)])),
  );
  return results.every(Boolean);
}

// On Vercel the platform sets x-forwarded-for itself, so the first entry is the real client.
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
