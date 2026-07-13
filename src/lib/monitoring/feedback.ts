import { feedbackIntegration } from "@sentry/react";
import type { Integration } from "@sentry/core";
import { getSentryEnvironment } from "@/lib/monitoring/sentry-privacy";

/** User Feedback widget — staging/preview only, never forced on production. */
export function createStagingFeedbackIntegration(): Integration | null {
  const environment = getSentryEnvironment();
  const enabled =
    process.env.NEXT_PUBLIC_SENTRY_USER_FEEDBACK === "true" ||
    process.env.SENTRY_USER_FEEDBACK === "true" ||
    environment === "preview" ||
    environment === "staging";

  if (!enabled) {
    return null;
  }

  return feedbackIntegration({
    colorScheme: "system",
    showBranding: false,
    triggerLabel: "Report a problem",
    formTitle: "Report a problem to Hey Ralli",
    submitButtonLabel: "Send report",
    messagePlaceholder:
      "What went wrong? Please avoid passwords, private family details, or payment info.",
    isNameRequired: false,
    isEmailRequired: false,
  });
}
