"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
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
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

async function captureOptionalScreenshot(): Promise<{
  filename: string;
  data: Uint8Array;
} | null> {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    // Prefer html2canvas when available (often present via Sentry tooling).
    const mod = await import("html2canvas").catch(() => null);
    if (!mod?.default) {
      return null;
    }
    const canvas = await mod.default(document.body, {
      logging: false,
      useCORS: true,
      allowTaint: false,
      scale: Math.min(window.devicePixelRatio || 1, 1.5),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/png", 0.85),
    );
    if (!blob) {
      return null;
    }
    const buffer = new Uint8Array(await blob.arrayBuffer());
    return { filename: "hey-ralli-report-screenshot.png", data: buffer };
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
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

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
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function resetForm() {
    setTryingToDo("");
    setWhatHappened("");
    setExpected("");
    setNotes("");
    setIncludeScreenshot(screenshotSupported);
    setSubmitState({ status: "idle" });
  }

  function closeDialog() {
    setOpen(false);
    // Keep success message briefly then clear so unsaved page work is untouched.
    if (submitState.status !== "success") {
      resetForm();
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || isPending) {
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
    startTransition(async () => {
      try {
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
          message: "User opened Report a Problem form",
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
          scope.setContext("report_a_problem", safeContext);
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

        await Sentry.flush(2000);

        const reference = toShortReference(eventId || lastEventId);
        setSubmitState({ status: "success", reference });
        setTryingToDo("");
        setWhatHappened("");
        setExpected("");
        setNotes("");
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feedback_type: "manual_report_a_problem_failed" },
        });
        setSubmitState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not send the report. Please try again.",
        });
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <>
      <button
        type="button"
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
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
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
                className="rounded p-1 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
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
              <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-cos-text">
                    What were you trying to do?
                  </span>
                  <textarea
                    required
                    rows={2}
                    value={tryingToDo}
                    onChange={(event) => setTryingToDo(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark"
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
                    onChange={(event) => setWhatHappened(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark"
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
                    onChange={(event) => setExpected(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-cos-text">
                    Additional notes
                  </span>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text outline-none focus:border-cos-dark"
                  />
                </label>

                <label className="flex items-start gap-2 text-xs text-cos-text">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={includeScreenshot && screenshotSupported}
                    disabled={!screenshotSupported || isPending}
                    onChange={(event) =>
                      setIncludeScreenshot(event.target.checked)
                    }
                  />
                  <span>
                    Include screenshot
                    {!screenshotSupported
                      ? " (not available in this browser)"
                      : " (selected by default)"}
                  </span>
                </label>

                {submitState.status === "error" ? (
                  <p className="text-xs text-cos-error-text" role="alert">
                    {submitState.message}
                  </p>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md border border-cos-border bg-transparent px-3 py-2 text-xs font-medium text-cos-muted hover:bg-cos-bg"
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-cos-dark px-3 py-2 text-xs font-medium text-white hover:bg-cos-primary-hover disabled:opacity-60"
                  >
                    {isPending ? (
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
