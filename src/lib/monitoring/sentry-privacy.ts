/**
 * Shared Sentry privacy helpers for Hey Ralli.
 * Scrubs passwords, tokens, payment data, and other sensitive fields
 * before anything is sent to Sentry.
 */

const SENSITIVE_KEY =
  /(password|passwd|secret|token|authorization|cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|service[_-]?role|stripe|card|cvv|ssn|dob|birth|child|student|parent.?email|phone|address|message.?body|private.?message|uploaded.?file|file.?content|base64)/i;

function scrubValue(value: unknown): unknown {
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    if (value.length > 200 && /data:|base64/i.test(value)) {
      return "[redacted-large-payload]";
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : scrubValue(entry);
    }
    return output;
  }
  return value;
}

export function scrubSentryEvent(event: unknown): unknown {
  if (!event || typeof event !== "object") {
    return event;
  }

  const next = { ...(event as Record<string, unknown>) };

  // Safari often aborts Next.js RSC prefetches as "Load failed" when leaving a
  // heavy page (e.g. Create with AI → dashboard). That is noise, not an app bug.
  if (isBenignNavigationNetworkError(next)) {
    return null;
  }

  if (next.request && typeof next.request === "object") {
    const request = { ...(next.request as Record<string, unknown>) };
    if (request.cookies) {
      request.cookies = "[redacted]";
    }
    if (request.headers && typeof request.headers === "object") {
      const headers = { ...(request.headers as Record<string, unknown>) };
      for (const key of Object.keys(headers)) {
        if (SENSITIVE_KEY.test(key)) {
          headers[key] = "[redacted]";
        }
      }
      request.headers = headers;
    }
    if (request.data) {
      request.data = scrubValue(request.data);
    }
    if (request.query_string) {
      request.query_string = scrubValue(request.query_string);
    }
    next.request = request;
  }

  if (next.extra) {
    next.extra = scrubValue(next.extra);
  }
  if (next.contexts) {
    next.contexts = scrubValue(next.contexts);
  }
  if (next.user && typeof next.user === "object") {
    const user = { ...(next.user as Record<string, unknown>) };
    delete user.email;
    delete user.ip_address;
    delete user.username;
    next.user = user;
  }

  return next;
}

function isBenignNavigationNetworkError(
  event: Record<string, unknown>,
): boolean {
  const exceptionValues =
    event.exception &&
    typeof event.exception === "object" &&
    Array.isArray((event.exception as { values?: unknown }).values)
      ? ((event.exception as { values: Array<{ type?: string; value?: string }> })
          .values ?? [])
      : [];

  const messages = [
    typeof event.message === "string" ? event.message : "",
    ...exceptionValues.map(
      (entry) => `${entry.type ?? ""} ${entry.value ?? ""}`.trim(),
    ),
  ]
    .join(" ")
    .toLowerCase();

  if (!messages) {
    return false;
  }

  const isLoadFailed =
    messages.includes("load failed") ||
    messages.includes("failed to fetch") ||
    messages.includes("networkerror");

  if (!isLoadFailed) {
    return false;
  }

  // Only drop the empty-stack / navigation aborts — keep real app exceptions.
  const hasFrames = exceptionValues.some((entry) => {
    const stacktrace = (entry as { stacktrace?: { frames?: unknown[] } })
      .stacktrace;
    return Boolean(stacktrace?.frames && stacktrace.frames.length > 0);
  });

  return !hasFrames;
}

export function getSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function isSentryEnabled(): boolean {
  if (process.env.SENTRY_ENABLED === "false") {
    return false;
  }
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
}
