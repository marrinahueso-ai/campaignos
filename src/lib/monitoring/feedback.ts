import { feedbackIntegration } from "@sentry/react";
import type { Integration } from "@sentry/core";

/**
 * Registers Sentry User Feedback (required for captureFeedback / screenshots).
 * autoInject is always false — Hey Ralli shows a custom gated "Report a Problem"
 * button from the authenticated dashboard layout instead.
 */
export function createReportProblemFeedbackIntegration(): Integration {
  return feedbackIntegration({
    autoInject: false,
    colorScheme: "light",
    showBranding: false,
    enableScreenshot: true,
    showName: false,
    showEmail: false,
    triggerLabel: "Report a Problem",
    formTitle: "Report a Problem",
    submitButtonLabel: "Send report",
    successMessageText: "Problem reported successfully",
    messagePlaceholder:
      "Describe the problem. Avoid passwords, private family details, or payment info.",
    themeLight: {
      background: "#fffcf7",
      foreground: "#2a2622",
      accentBackground: "#2a2622",
      accentForeground: "#fffcf7",
      outline: "1px solid #ddd4c8",
    },
  });
}

/** @deprecated Use createReportProblemFeedbackIntegration */
export function createStagingFeedbackIntegration(): Integration | null {
  return createReportProblemFeedbackIntegration();
}
