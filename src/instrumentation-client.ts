import * as Sentry from "@sentry/nextjs";
import {
  getSentryEnvironment,
  isSentryEnabled,
  scrubSentryEvent,
} from "@/lib/monitoring/sentry-privacy";
import { createReportProblemFeedbackIntegration } from "@/lib/monitoring/feedback";

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
    integrations: [createReportProblemFeedbackIntegration()],
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
