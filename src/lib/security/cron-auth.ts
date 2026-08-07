/**
 * Shared cron route authorization.
 * Local `next dev` may omit CRON_SECRET; Preview/Production always require it.
 */
export function isCronRequestAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase();
    if (vercelEnv === "production" || vercelEnv === "preview") {
      return false;
    }
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}
