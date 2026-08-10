/**
 * Kill switch for real newsletter delivery. Defaults OFF (fail closed) in
 * every environment — an operator must explicitly set the env var to `"true"`
 * to allow Send Now / scheduled sends to reach Resend. Test sends are not
 * gated by this (see `test-send.ts`).
 *
 * No `server-only` guard here on purpose: this is a pure env-var read (not a
 * secret — the flag itself is not `NEXT_PUBLIC_*`, so it is already
 * unreachable from client bundles) and unit tests import it directly.
 */
export function isNewsletterProductionSendEnabled(): boolean {
  return process.env.NEWSLETTER_PRODUCTION_SEND_ENABLED === "true";
}

/** Returns an error message when production send is disabled, else null. */
export function assertNewsletterProductionSendEnabled(): string | null {
  if (isNewsletterProductionSendEnabled()) {
    return null;
  }
  return "Newsletter production sending is currently disabled for this environment.";
}
