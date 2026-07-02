"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  archiveEventAction,
  deleteEventAndRedirectAction,
  restoreEventAction,
} from "@/lib/events/actions";
import { isArchivedEvent } from "@/lib/events/event-status";
import type { Event } from "@/types";

type ConfirmAction = "archive" | "restore" | "delete" | null;

const DELETE_CONFIRM_TEXT = "DELETE";

interface EventManageMenuProps {
  event: Event;
  size?: "sm" | "md" | "lg";
}

export function EventManageMenu({ event, size = "sm" }: EventManageMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const archived = isArchivedEvent(event);

  function openConfirm(action: ConfirmAction) {
    setMenuOpen(false);
    setConfirmAction(action);
    setDeleteConfirmText("");
    setError(null);
  }

  function closeConfirm() {
    if (!isPending) {
      setConfirmAction(null);
      setDeleteConfirmText("");
      setError(null);
    }
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction === "delete" && deleteConfirmText !== DELETE_CONFIRM_TEXT) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        if (confirmAction === "archive") {
          const result = await archiveEventAction(event.id);
          if (!result.success) {
            setError(result.error ?? "Unable to archive campaign.");
            return;
          }
        } else if (confirmAction === "restore") {
          const result = await restoreEventAction(event.id);
          if (!result.success) {
            setError(result.error ?? "Unable to restore campaign.");
            return;
          }
        } else if (confirmAction === "delete") {
          await deleteEventAndRedirectAction(event.id);
          return;
        }

        setConfirmAction(null);
        setDeleteConfirmText("");
        setMenuOpen(false);
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete campaign.",
        );
      }
    });
  }

  const confirmCopy =
    confirmAction === "archive"
      ? {
          title: "Archive this campaign?",
          message:
            "Recommended when you're done with active work. The campaign stays available by direct link and can be restored anytime. It will be hidden from Dashboard, Campaigns, Calendar, and Campaign Director.",
          confirmLabel: "Archive campaign",
          variant: "primary" as const,
        }
      : confirmAction === "restore"
        ? {
            title: "Restore this campaign?",
            message:
              "It will reappear on Dashboard, Campaigns, Calendar, and Campaign Director.",
            confirmLabel: "Restore campaign",
            variant: "primary" as const,
          }
        : confirmAction === "delete"
          ? {
              title: "Delete this campaign permanently?",
              message:
                "This removes the campaign and all workspace data (drafts, versions, timeline steps, assets, approvals, schedules, and activity). This cannot be undone. Prefer archive unless you need permanent removal.",
              confirmLabel: "Delete permanently",
              variant: "danger" as const,
            }
          : null;

  const deleteConfirmed = deleteConfirmText === DELETE_CONFIRM_TEXT;

  return (
    <>
      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          size={size}
          disabled={isPending}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="h-4 w-4" />
          Actions
        </Button>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              className="absolute left-0 top-full z-50 mt-2 min-w-[14rem] rounded-xl border border-cos-border bg-cos-card py-1 shadow-lg"
            >
              {archived ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
                  onClick={() => openConfirm("restore")}
                >
                  <ArchiveRestore className="h-4 w-4 shrink-0" />
                  Restore campaign
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
                  onClick={() => openConfirm("archive")}
                >
                  <span className="flex items-center gap-2">
                    <Archive className="h-4 w-4 shrink-0" />
                    Archive campaign
                  </span>
                  <span className="rounded-full bg-cos-info px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cos-info-text">
                    Recommended
                  </span>
                </button>
              )}
              <div className="my-1 border-t border-cos-border" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-error-text hover:bg-cos-bg"
                onClick={() => openConfirm("delete")}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Delete campaign
              </button>
            </div>
          </>
        )}
      </div>

      {confirmAction && confirmCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-manage-confirm-title"
            className="w-full max-w-md rounded-2xl border border-cos-border bg-cos-card p-6 shadow-xl"
          >
            <h2
              id="event-manage-confirm-title"
              className="text-lg font-semibold text-cos-text"
            >
              {confirmCopy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">
              {confirmCopy.message}
            </p>

            {confirmAction === "delete" && (
              <div className="mt-4">
                <Input
                  label={`Type ${DELETE_CONFIRM_TEXT} to confirm`}
                  value={deleteConfirmText}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isPending}
                  placeholder={DELETE_CONFIRM_TEXT}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                />
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={closeConfirm}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmCopy.variant}
                disabled={
                  isPending || (confirmAction === "delete" && !deleteConfirmed)
                }
                onClick={handleConfirm}
              >
                {isPending ? "Working…" : confirmCopy.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface EventArchivedBannerProps {
  className?: string;
}

export function EventArchivedBanner({ className = "" }: EventArchivedBannerProps) {
  return (
    <p
      className={`rounded-lg border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted ${className}`.trim()}
      role="status"
    >
      This campaign is archived. It is hidden from Dashboard, Campaigns, and Calendar.
      Restore it from Actions to bring it back into active views.
    </p>
  );
}
