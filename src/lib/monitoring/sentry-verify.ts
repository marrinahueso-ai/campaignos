/**
 * Temporary Sentry verification helpers.
 * The HTTP routes that call these are locked behind CRON_SECRET.
 */

import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/monitoring/sentry-privacy";

function getSentryVerifySecret(): string | null {
  const secret =
    process.env.SENTRY_VERIFY_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  return secret || null;
}

export function isSentryTestAuthorized(request: Request): boolean {
  const secret = getSentryVerifySecret();
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/** Shared secret check for the browser verify page. */
export function isSentryVerifySecretValid(provided: string | null | undefined): boolean {
  const secret = getSentryVerifySecret();
  if (!secret || !provided?.trim()) {
    return false;
  }
  return provided.trim() === secret;
}

export function captureSentryServerTestError(): { ok: boolean; reason?: string } {
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
