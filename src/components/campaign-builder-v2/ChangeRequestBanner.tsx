"use client";

import { Button } from "@/components/ui/Button";
import { changeRequestDisplayComment } from "@/lib/dev-tools/clear-generated-content";

interface ChangeRequestBannerProps {
  comment?: string | null;
  /** When true, show awaiting-approval copy instead of changes-requested. */
  awaitingApproval?: boolean;
  /** Unified Edit (Artwork | Captions). Preferred over separate artwork/caption handlers. */
  onEdit?: () => void;
  onEditArtwork?: () => void;
  onEditCaption?: () => void;
  onEditSchedule?: () => void;
  onResendForApproval?: () => void;
  isResending?: boolean;
  /** Optional link-style edit paths (Review step). */
  editHref?: string | null;
  editArtworkHref?: string | null;
  editCaptionHref?: string | null;
  /** Preview Campaign deep link for changing the post schedule. */
  changeDateHref?: string | null;
  message?: string | null;
  messageIsError?: boolean;
}

export function ChangeRequestBanner({
  comment,
  awaitingApproval = false,
  onEdit,
  onEditArtwork,
  onEditCaption,
  onEditSchedule,
  onResendForApproval,
  isResending = false,
  editHref,
  editArtworkHref,
  editCaptionHref,
  changeDateHref,
  message,
  messageIsError = false,
}: ChangeRequestBannerProps) {
  const editHandler = onEdit ?? onEditArtwork ?? onEditCaption;
  const editLink = editHref ?? editArtworkHref ?? editCaptionHref;
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
        {awaitingApproval ? "Waiting for approval" : "Changes requested"}
      </p>
      {!awaitingApproval ? (
        displayComment ? (
          <p className="mt-2 text-sm leading-relaxed text-red-900">
            {displayComment}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-red-800">
            An approver requested changes. Edit artwork or captions, update the
            schedule if needed, then send for re-approval — regenerating is
            optional.
          </p>
        )
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          You can update artwork, captions, or schedule on this milestone and
          resend without regenerating other posts.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {editHandler ? (
          <Button
            variant={awaitingApproval ? "secondary" : "primary"}
            size="sm"
            onClick={editHandler}
          >
            Edit
          </Button>
        ) : editLink ? (
          <Button
            href={editLink}
            variant={awaitingApproval ? "secondary" : "primary"}
            size="sm"
          >
            Edit
          </Button>
        ) : null}
        {onEditSchedule ? (
          <Button variant="secondary" size="sm" onClick={onEditSchedule}>
            Change Date
          </Button>
        ) : changeDateHref ? (
          <Button href={changeDateHref} variant="secondary" size="sm">
            Change Date
          </Button>
        ) : null}
        {onResendForApproval ? (
          <Button
            variant={
              awaitingApproval || (!editHandler && !editLink)
                ? "primary"
                : "secondary"
            }
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
