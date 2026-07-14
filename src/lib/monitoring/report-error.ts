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

function extractErrorMessage(
  error: unknown,
  fallback?: string | null,
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
  }
  return fallback?.trim() || "Unknown integration error";
}

export function reportIntegrationError(
  area: IntegrationArea,
  error: unknown,
  context?: SafeActionContext,
): void {
  if (!isSentryEnabled()) {
    return;
  }

  const message = extractErrorMessage(error, context?.message);

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
        message: context.message ?? message,
      });
    }
    Sentry.captureException(
      error instanceof Error ? error : new Error(message),
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

/**
 * Report a hung / stalled operation that never threw.
 * Use for long-running AI generation, saves, or publishes that exceed a watchdog.
 */
export function reportStalledOperation(
  area: IntegrationArea,
  context: SafeActionContext & {
    message: string;
    durationMs?: number | null;
    level?: "warning" | "error";
  },
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("integration", area);
    scope.setTag("failure_type", "stall");
    scope.setLevel(context.level ?? "error");
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
      durationMs: context.durationMs ?? null,
    });
    Sentry.captureMessage(
      `[${area}] stall: ${context.action || "operation"} — ${context.message}`,
      context.level ?? "error",
    );
  });
}

/**
 * Race a promise against a stall timeout. Does not cancel the underlying work.
 * Reports to Sentry when the timeout wins.
 */
export async function withStallWatchdog<T>(
  area: IntegrationArea,
  work: Promise<T>,
  context: SafeActionContext & {
    timeoutMs: number;
    warningMs?: number;
    stallMessage: string;
  },
): Promise<T> {
  const started = Date.now();
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  addActionBreadcrumb(area, `${context.action || "operation"} started`, context);

  if (context.warningMs && context.warningMs > 0) {
    warningTimer = setTimeout(() => {
      if (settled) {
        return;
      }
      reportStalledOperation(area, {
        ...context,
        message: `${context.stallMessage} (still running after ${context.warningMs}ms)`,
        durationMs: Date.now() - started,
        level: "warning",
      });
    }, context.warningMs);
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      reportStalledOperation(area, {
        ...context,
        message: context.stallMessage,
        durationMs: Date.now() - started,
        level: "error",
      });
      reject(
        new Error(
          context.stallMessage ||
            "This is taking longer than expected. Please try again.",
        ),
      );
    }, context.timeoutMs);
  });

  try {
    return await Promise.race([work, timeoutPromise]);
  } finally {
    settled = true;
    if (warningTimer) {
      clearTimeout(warningTimer);
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
    }
  }
}
