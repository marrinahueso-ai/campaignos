import "server-only";

import { headers } from "next/headers";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export { rateLimitMessage } from "@/lib/security/rate-limit-message";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const ALLOW_RESULT: RateLimitResult = {
  allowed: true,
  remaining: Number.POSITIVE_INFINITY,
  retryAfterSeconds: 0,
};

/**
 * Fixed-window rate limit backed by `public.rate_limit_hit` (Postgres RPC,
 * service-role only). Fails **open** on infra errors (missing service role
 * locally, DB hiccup) — this is defense in depth, not the primary control,
 * so an outage here should not take down login/signup for everyone.
 */
export async function checkRateLimit(input: {
  key: string;
  windowSeconds: number;
  max: number;
}): Promise<RateLimitResult> {
  if (!isSupabaseAdminConfigured()) {
    return ALLOW_RESULT;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: input.key,
      p_window_seconds: input.windowSeconds,
      p_max: input.max,
    });

    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      console.error("[rate-limit] check failed, allowing request:", error?.message);
      return ALLOW_RESULT;
    }

    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
    };
  } catch (err) {
    console.error("[rate-limit] check threw, allowing request:", err);
    return ALLOW_RESULT;
  }
}

/** Best-effort caller IP from proxy headers (Vercel sets x-forwarded-for / x-real-ip). */
export async function getRequestIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0]!.trim();
    }
    const realIp = headersList.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch {
    // headers() unavailable outside a request context
  }
  return "unknown";
}
