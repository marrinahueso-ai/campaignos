import * as Sentry from "@sentry/nextjs";
import {
  getSentryEnvironment,
  isSentryEnabled,
  scrubSentryEvent,
} from "@/lib/monitoring/sentry-privacy";
import { createStagingFeedbackIntegration } from "@/lib/monitoring/feedback";

const feedback = createStagingFeedbackIntegration();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: isSentryEnabled(),
  environment: getSentryEnvironment(),
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  // Privacy-first: no session replay, no default PII
  sendDefaultPii: false,
  integrations: feedback ? [feedback] : [],
  beforeSend(event) {
    return scrubSentryEvent(event) as typeof event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
