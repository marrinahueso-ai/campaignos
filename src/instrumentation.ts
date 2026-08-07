import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/monitoring/sentry-privacy";

export async function register() {
  // Always check deployed secrets — independent of Sentry.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportProductionSecretGaps } = await import(
      "@/lib/security/production-secrets"
    );
    reportProductionSecretGaps();
  }

  if (!isSentryEnabled()) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (!isSentryEnabled()) {
    return;
  }
  return Sentry.captureRequestError(...args);
};
