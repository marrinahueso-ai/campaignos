/**
 * Pure formatting helper, split out from rate-limit.ts (which is
 * `server-only`) so it can be unit tested with the plain Node test runner.
 */
export function rateLimitMessage(
  retryAfterSeconds: number,
  subject = "attempts",
): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const wait = minutes <= 1 ? "a minute" : `${minutes} minutes`;
  return `Too many ${subject}. Please wait ${wait} and try again.`;
}
