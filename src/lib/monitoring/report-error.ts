/**
 * Safe error reporting for Hey Ralli integrations.
 * Use in catch blocks and failed action results without changing business logic.
 */

import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/monitoring/sentry-privacy";

export type IntegrationArea =
  | "ai"
  | "supabase"
  | "meta"
  | "resend"
  | "stripe"
  | "calendar"
  | "approvals"
  | "team"
  | "app";

export type SafeActionContext = {
  action?: string;
  route?: string;
  eventId?: string | null;
  campaignId?: string | null;
  milestoneId?: string | null;
  organizationId?: string | null;
  statusCode?: number | null;
  message?: string | null;
};

const EXPECTED_VALIDATION =
  /(required|invalid|choose|select|permission|not configured|no recipients|complete required|wait for|upload)/i;

function isExpectedValidationMessage(message: string | null | undefined): boolean {
  if (!message?.trim()) {
    return false;
  }
  return EXPECTED_VALIDATION.test(message) && message.length < 180;
}

export function addActionBreadcrumb(
  area: IntegrationArea,
  message: string,
  context?: SafeActionContext,
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.addBreadcrumb({
    category: `hey-ralli.${area}`,
    message,
    level: "info",
    data: {
      action: context?.action,
      route: context?.route,
      eventId: context?.eventId ?? undefined,
      campaignId: context?.campaignId ?? undefined,
      milestoneId: context?.milestoneId ?? undefined,
      organizationId: context?.organizationId ?? undefined,
    },
  });
}

export function reportIntegrationError(
  area: IntegrationArea,
  error: unknown,
  context?: SafeActionContext,
): void {
  if (!isSentryEnabled()) {
    return;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : context?.message;

  if (isExpectedValidationMessage(message)) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("integration", area);
    scope.setLevel("error");
    if (context?.action) {
      scope.setTag("action", context.action);
    }
    if (context) {
      scope.setContext("integration_context", {
        action: context.action,
        route: context.route,
        eventId: context.eventId,
        campaignId: context.campaignId,
        milestoneId: context.milestoneId,
        organizationId: context.organizationId,
        statusCode: context.statusCode,
        message: context.message,
      });
    }
    Sentry.captureException(
      error instanceof Error ? error : new Error(message || "Unknown integration error"),
    );
  });
}

/**
 * Report a failed API/action result that did not throw (success:false / error message).
 * Skips expected validation messages.
 */
export function reportFailedAction(
  area: IntegrationArea,
  context: SafeActionContext & { message: string },
): void {
  if (!isSentryEnabled()) {
    return;
  }
  if (isExpectedValidationMessage(context.message)) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("integration", area);
    scope.setTag("failure_type", "action_result");
    scope.setLevel("error");
    if (context.action) {
      scope.setTag("action", context.action);
    }
    scope.setContext("integration_context", {
      action: context.action,
      route: context.route,
      eventId: context.eventId,
      campaignId: context.campaignId,
      milestoneId: context.milestoneId,
      organizationId: context.organizationId,
      statusCode: context.statusCode,
      message: context.message,
    });
    Sentry.captureMessage(
      `[${area}] ${context.action || "action"} failed: ${context.message}`,
      "error",
    );
  });
}
