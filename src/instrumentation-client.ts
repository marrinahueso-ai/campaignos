import * as Sentry from "@sentry/nextjs";
import {
  getSentryEnvironment,
  isSentryEnabled,
  scrubSentryEvent,
} from "@/lib/monitoring/sentry-privacy";

if (isSentryEnabled()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: true,
    environment: getSentryEnvironment(),
    release:
      process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    // Privacy-first: no session replay, no default PII
    sendDefaultPii: false,
    // Report a Problem uses our React dialog and `Sentry.captureFeedback`
    // directly. Loading Sentry's Preact feedback widget is unnecessary and
    // can perform DOM cleanup after navigation.
    beforeSend(event) {
      return scrubSentryEvent(event) as typeof event;
    },
  });
}

export const onRouterTransitionStart: typeof Sentry.captureRouterTransitionStart =
  (...args) => {
    if (!isSentryEnabled()) {
      return;
    }
    return Sentry.captureRouterTransitionStart(...args);
  };
