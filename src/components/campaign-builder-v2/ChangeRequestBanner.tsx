"use client";

import { Button } from "@/components/ui/Button";
import { changeRequestDisplayComment } from "@/lib/dev-tools/clear-generated-content";

interface ChangeRequestBannerProps {
  comment?: string | null;
  /** When true, show awaiting-approval copy instead of changes-requested. */
  awaitingApproval?: boolean;
  onEditArtwork?: () => void;
  onEditCaption?: () => void;
  onEditSchedule?: () => void;
  onResendForApproval?: () => void;
  isResending?: boolean;
  /** Optional link-style edit paths (Review step). */
  editArtworkHref?: string | null;
  editCaptionHref?: string | null;
  message?: string | null;
  messageIsError?: boolean;
}

export function ChangeRequestBanner({
  comment,
  awaitingApproval = false,
  onEditArtwork,
  onEditCaption,
  onEditSchedule,
  onResendForApproval,
  isResending = false,
  editArtworkHref,
  editCaptionHref,
  message,
  messageIsError = false,
}: ChangeRequestBannerProps) {
  const displayComment = changeRequestDisplayComment(comment);

  return (
    <div
      className={
        awaitingApproval
          ? "rounded border border-cos-border bg-cos-bg/60 px-4 py-3"
          : "rounded border border-red-200 bg-red-50 px-4 py-3"
      }
      role="status"
    >
      <p
        className={
          awaitingApproval
            ? "text-xs font-semibold tracking-[0.12em] text-cos-muted uppercase"
            : "text-xs font-semibold tracking-[0.12em] text-red-800 uppercase"
        }
      >
        {awaitingApproval ? "Awaiting approval" : "Changes requested"}
      </p>
      {!awaitingApproval ? (
        displayComment ? (
          <p className="mt-2 text-sm leading-relaxed text-red-900">
            {displayComment}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-red-800">
            An approver requested changes. Edit caption, schedule, or artwork on
            this milestone, then send for re-approval — regenerating artwork is
            optional.
          </p>
        )
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          You can update caption, schedule, or artwork on this milestone and
          resend without regenerating other milestones.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {onEditCaption ? (
          <Button variant="secondary" size="sm" onClick={onEditCaption}>
            Edit caption
          </Button>
        ) : editCaptionHref ? (
          <Button href={editCaptionHref} variant="secondary" size="sm">
            Edit caption
          </Button>
        ) : null}
        {onEditSchedule ? (
          <Button variant="secondary" size="sm" onClick={onEditSchedule}>
            Edit schedule
          </Button>
        ) : null}
        {onEditArtwork ? (
          <Button variant="secondary" size="sm" onClick={onEditArtwork}>
            Edit artwork
          </Button>
        ) : editArtworkHref ? (
          <Button href={editArtworkHref} variant="secondary" size="sm">
            Edit artwork
          </Button>
        ) : null}
        {onResendForApproval ? (
          <Button
            variant="primary"
            size="sm"
            disabled={isResending}
            onClick={onResendForApproval}
          >
            {isResending
              ? "Sending…"
              : awaitingApproval
                ? "Resend for approval"
                : "Send for re-approval"}
          </Button>
        ) : null}
      </div>

      {message ? (
        <p
          className={
            messageIsError
              ? "mt-2 text-sm text-red-700"
              : "mt-2 text-sm text-cos-success"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
