import * as Sentry from "@sentry/nextjs";
import {
  getSentryEnvironment,
  isSentryEnabled,
  scrubSentryEvent,
} from "./src/lib/monitoring/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: isSentryEnabled(),
  environment: getSentryEnvironment(),
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubSentryEvent(event) as typeof event;
  },
});
