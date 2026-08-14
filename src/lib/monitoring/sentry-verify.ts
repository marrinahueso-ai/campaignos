/**
 * Temporary Sentry verification helpers.
 * The HTTP routes that call these are locked behind a dedicated
 * SENTRY_VERIFY_SECRET — deliberately NOT CRON_SECRET. The browser-side
 * verify page (/dev/sentry-verify) necessarily carries its secret in a URL
 * query string, which ends up in browser history and access/CDN logs; if
 * that secret were CRON_SECRET (as it previously defaulted to), a leaked
 * verify-page URL would hand over the same bearer token that authorizes
 * every real /api/cron/* route (approval backfill, Meta publish, newsletter
 * sends, etc). Using a separate, single-purpose secret contains the blast
 * radius of that unavoidable query-string exposure to this verify feature
 * alone. If SENTRY_VERIFY_SECRET is unset, verification is simply disabled
 * (fail closed) rather than falling back to a higher-value secret.
 */

import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/monitoring/sentry-privacy";

function getSentryVerifySecret(): string | null {
  const secret = process.env.SENTRY_VERIFY_SECRET?.trim() || "";
  return secret || null;
}

/** API route (curl-friendly): header-only — never accepts the secret via query string. */
export function isSentryTestAuthorized(request: Request): boolean {
  const secret = getSentryVerifySecret();
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Shared secret check for the browser verify page. */
export function isSentryVerifySecretValid(provided: string | null | undefined): boolean {
  const secret = getSentryVerifySecret();
  if (!secret || !provided?.trim()) {
    return false;
  }
  return provided.trim() === secret;
}

export async function captureSentryServerTestError(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (!isSentryEnabled()) {
    return {
      ok: false,
      reason: "Sentry is disabled or NEXT_PUBLIC_SENTRY_DSN is missing.",
    };
  }

  Sentry.withScope((scope) => {
    scope.setTag("sentry_verify", "server");
    scope.setLevel("error");
    Sentry.captureException(
      new Error("Hey Ralli Sentry server verification error (safe test)"),
    );
  });

  // Serverless functions can exit before the SDK finishes sending.
  await Sentry.flush(5000);

  return { ok: true };
}

export function captureSentryClientTestErrorScript(): string {
  return `
    (function () {
      if (typeof window === "undefined" || !window.Sentry) {
        document.body.innerHTML = "<p>Sentry browser SDK not loaded.</p>";
        return;
      }
      window.Sentry.withScope(function (scope) {
        scope.setTag("sentry_verify", "client");
        scope.setLevel("error");
        window.Sentry.captureException(
          new Error("Hey Ralli Sentry browser verification error (safe test)")
        );
      });
      document.body.innerHTML = "<p>Browser test error sent to Sentry. You can close this tab.</p>";
    })();
  `;
}
