"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bug, Loader2, X } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import {
  buildReportProblemSafeContext,
  formatReportProblemMessage,
  toShortReference,
} from "@/lib/monitoring/report-a-problem-context";

type ReportProblemButtonProps = {
  userId: string | null;
  userRole: string | null;
  organizationId: string | null;
  environment: string;
  release: string | null;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting"; phase: "screenshot" | "sending" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

const SCREENSHOT_TIMEOUT_MS = 4000;
const SUBMIT_TIMEOUT_MS = 15000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function captureOptionalScreenshot(): Promise<{
  filename: string;
  data: Uint8Array;
} | null> {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const mod = await withTimeout(
      import("html2canvas"),
      2000,
      "Screenshot library load",
    ).catch(() => null);
    if (!mod?.default) {
      return null;
    }

    const canvas = await withTimeout(
      mod.default(document.body, {
        logging: false,
        useCORS: true,
        allowTaint: false,
        // Keep this light — full-page campaign hubs can hang html2canvas.
        scale: 0.75,
        width: Math.min(window.innerWidth, 1280),
        height: Math.min(window.innerHeight, 900),
        windowWidth: Math.min(window.innerWidth, 1280),
        windowHeight: Math.min(window.innerHeight, 900),
        ignoreElements: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }
          return (
            element.getAttribute("role") === "dialog" ||
            element.dataset.reportProblem === "true" ||
            element.classList.contains("fixed")
          );
        },
      }),
      SCREENSHOT_TIMEOUT_MS,
      "Screenshot capture",
    );

    const blob = await withTimeout(
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob((value) => resolve(value), "image/jpeg", 0.7),
      ),
      2000,
      "Screenshot encode",
    );
    if (!blob || blob.size > 1_500_000) {
      return null;
    }
    const buffer = new Uint8Array(await blob.arrayBuffer());
    return { filename: "hey-ralli-report-screenshot.jpg", data: buffer };
  } catch {
    return null;
  }
}

export function ReportProblemButton({
  userId,
  userRole,
  organizationId,
  environment,
  release,
}: ReportProblemButtonProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [tryingToDo, setTryingToDo] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [screenshotSupported, setScreenshotSupported] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const submittingRef = useRef(false);

  useEffect(() => {
    if (userId) {
      Sentry.setUser({ id: userId });
    }
    if (userRole) {
      Sentry.setTag("user_role", userRole);
    }
    if (organizationId) {
      Sentry.setTag("organization_id", organizationId);
    }
  }, [userId, userRole, organizationId]);

  useEffect(() => {
    let cancelled = false;
    void import("html2canvas")
      .then(() => {
        if (!cancelled) {
          setScreenshotSupported(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setScreenshotSupported(false);
          setIncludeScreenshot(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && submitState.status !== "submitting") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitState.status]);

  function resetForm() {
    setTryingToDo("");
    setWhatHappened("");
    setExpected("");
    setNotes("");
    setIncludeScreenshot(screenshotSupported);
    setSubmitState({ status: "idle" });
  }

  function closeDialog() {
    if (submitState.status === "submitting") {
      return;
    }
    setOpen(false);
    if (submitState.status !== "success") {
      resetForm();
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    if (!tryingToDo.trim() || !whatHappened.trim() || !expected.trim()) {
      setSubmitState({
        status: "error",
        message: "Please fill in the first three fields.",
      });
      return;
    }

    submittingRef.current = true;
    setSubmitState({ status: "submitting", phase: "screenshot" });

    try {
      await withTimeout(
        (async () => {
          const lastEventId = Sentry.lastEventId() || null;
          const safeContext = buildReportProblemSafeContext({
            userId,
            userRole,
            organizationId,
            environment,
            release,
            lastSentryEventId: lastEventId,
          });

          Sentry.addBreadcrumb({
            category: "hey-ralli.report-a-problem",
            message: "User submitted Report a Problem form",
            level: "info",
            data: {
              route: safeContext.route,
              eventId: safeContext.eventId ?? undefined,
              organizationId: safeContext.organizationId ?? undefined,
            },
          });

          const message = formatReportProblemMessage({
            tryingToDo,
            whatHappened,
            expected,
            notes,
          });

          const attachments: Array<{ filename: string; data: Uint8Array }> = [];
          if (includeScreenshot && screenshotSupported) {
            const shot = await captureOptionalScreenshot();
            if (shot) {
              attachments.push(shot);
            }
          }

          setSubmitState({ status: "submitting", phase: "sending" });

          let eventId = "";
          Sentry.withScope((scope) => {
            scope.setTag("feedback_type", "manual_report_a_problem");
            scope.setTag("environment", safeContext.environment);
            if (safeContext.userRole) {
              scope.setTag("user_role", safeContext.userRole);
            }
            if (safeContext.eventId) {
              scope.setTag("event_id", safeContext.eventId);
            }
            if (safeContext.organizationId) {
              scope.setTag("organization_id", safeContext.organizationId);
            }
            scope.setContext("report_a_problem", {
              ...safeContext,
              screenshotAttached: attachments.length > 0,
            });
            eventId = Sentry.captureFeedback(
              {
                message,
                url: safeContext.url,
                source: "hey_ralli_report_a_problem",
                associatedEventId: lastEventId ?? undefined,
                tags: {
                  feedback_type: "manual_report_a_problem",
                },
              },
              {
                includeReplay: false,
                attachments: attachments.map((attachment) => ({
                  filename: attachment.filename,
                  data: attachment.data,
                })),
              },
            );
          });

          await Sentry.flush(2500);

          const reference = toShortReference(eventId || lastEventId);
          setSubmitState({ status: "success", reference });
          setTryingToDo("");
          setWhatHappened("");
          setExpected("");
          setNotes("");
        })(),
        SUBMIT_TIMEOUT_MS,
        "Report submission",
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feedback_type: "manual_report_a_problem_failed" },
      });
      void Sentry.flush(1000);
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message.includes("timed out")
              ? "Sending took too long. Please try again without a screenshot."
              : error.message
            : "Could not send the report. Please try again.",
      });
    } finally {
      submittingRef.current = false;
    }
  }

  const isSubmitting = submitState.status === "submitting";

  return (
    <>
      <button
        type="button"
        data-report-problem="true"
        onClick={() => {
          setSubmitState({ status: "idle" });
          setOpen(true);
        }}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-md border border-cos-border bg-cos-card px-3 py-2 text-xs font-medium text-cos-text shadow-sm transition hover:bg-cos-bg-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cos-dark sm:bottom-6 sm:right-6"
        aria-haspopup="dialog"
      >
        <Bug className="h-3.5 w-3.5 text-cos-muted" strokeWidth={1.5} aria-hidden />
        Report a Problem
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-cos-dark/30 p-4 sm:items-center"
          role="presentation"
          data-report-problem="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-report-problem="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-cos-border bg-cos-card shadow-lg"
          >
            <div className="flex items-start justify-between border-b border-cos-border px-4 py-3">
              <div>
                <h2 id={titleId} className="font-display text-xl text-cos-text">
                  Report a Problem
                </h2>
                <p className="mt-1 text-xs text-cos-muted">
                  Tell us what went wrong. Avoid passwords, payment details, or
                  private family information.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="rounded p-1 text-cos-muted hover:bg-cos-bg hover:text-cos-text disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {submitState.status === "success" ? (
              <div className="space-y-4 px-4 py-5">
                <p className="text-sm font-medium text-cos-success-text">
                  Problem reported successfully
                </p>
                <p className="text-sm text-cos-text">
                  Reference number:{" "}
                  <span className="font-mono font-semibold">
                    {submitState.reference}
                  </span>
                </p>
                <p className="text-xs text-cos-muted">
                  You can stay on this page. Your unsaved work was not changed.
                </p>
                <button
                  type="button"
                  className="rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-xs font-medium text-cos-text hover:bg-cos-bg-alt"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 px-4 py-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-cos-text">
                    What were you trying to do?
                  </span>
                  <textarea
                    required
                    rows={2}
                    value={tryingToDo}
                    disabled={isSubmitting}
                    onChange={(event) => setTryingToDo(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark disabled:opacity-60"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-cos-text">
                    What happened instead?
                  </span>
                  <textarea
                    required
                    rows={2}
                    value={whatHappened}
                    disabled={isSubmitting}
                    onChange={(event) => setWhatHappened(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark disabled:opacity-60"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-cos-text">
                    What did you expect to happen?
                  </span>
                  <textarea
                    required
                    rows={2}
                    value={expected}
                    disabled={isSubmitting}
                    onChange={(event) => setExpected(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark disabled:opacity-60"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-cos-text">
                    Additional notes
                  </span>
                  <textarea
                    rows={2}
                    value={notes}
                    disabled={isSubmitting}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark disabled:opacity-60"
                  />
                </label>

                <label className="flex items-start gap-2 text-xs text-cos-text">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={includeScreenshot && screenshotSupported}
                    disabled={!screenshotSupported || isSubmitting}
                    onChange={(event) =>
                      setIncludeScreenshot(event.target.checked)
                    }
                  />
                  <span>
                    Include screenshot
                    {!screenshotSupported
                      ? " (not available in this browser)"
                      : " (selected by default; skipped if it takes too long)"}
                  </span>
                </label>

                {submitState.status === "submitting" ? (
                  <p className="text-xs text-cos-muted" role="status">
                    {submitState.phase === "screenshot"
                      ? "Capturing screenshot…"
                      : "Sending report…"}
                  </p>
                ) : null}

                {submitState.status === "error" ? (
                  <p className="text-xs text-cos-error-text" role="alert">
                    {submitState.message}
                  </p>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md border border-cos-border bg-transparent px-3 py-2 text-xs font-medium text-cos-muted hover:bg-cos-bg disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-md bg-cos-dark px-3 py-2 text-xs font-medium text-white hover:bg-cos-primary-hover disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : null}
                    {submitState.status === "error" ? "Retry" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
