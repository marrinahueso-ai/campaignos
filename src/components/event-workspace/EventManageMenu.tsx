"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { EventEditDetailsDialog } from "@/components/event-workspace/EditEventDetailsButton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
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
const MENU_MIN_WIDTH = 224; // min-w-[14rem]
const VIEWPORT_PAD = 8;

interface EventManageMenuProps {
  event: Event;
  size?: "sm" | "md" | "lg";
  includeEditDetails?: boolean;
  iconOnly?: boolean;
  triggerClassName?: string;
  /**
   * User-facing noun for archive/delete/restore copy.
   * Backend actions remain unchanged.
   */
  entityNoun?: "event" | "campaign";
}

export function EventManageMenu({
  event,
  size = "sm",
  includeEditDetails = false,
  iconOnly = false,
  triggerClassName,
  entityNoun = "campaign",
}: EventManageMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);

  const archived = isArchivedEvent(event);
  const noun = entityNoun;
  const nounTitle = noun === "event" ? "event" : "campaign";

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuCoords(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      let left = rect.left;
      left = Math.max(
        VIEWPORT_PAD,
        Math.min(left, window.innerWidth - MENU_MIN_WIDTH - VIEWPORT_PAD),
      );
      setMenuCoords({ top: rect.bottom + 8, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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
          title: `Archive this ${nounTitle}?`,
          message:
            noun === "event"
              ? "Recommended when you're done with active work. The event stays available by direct link and can be restored anytime. It will be hidden from Dashboard, Events, and Calendar."
              : "Recommended when you're done with active work. The campaign stays available by direct link and can be restored anytime. It will be hidden from Dashboard, Campaigns, Calendar, and Campaign Director.",
          confirmLabel: `Archive ${nounTitle}`,
          variant: "primary" as const,
        }
      : confirmAction === "restore"
        ? {
            title: `Restore this ${nounTitle}?`,
            message:
              noun === "event"
                ? "It will reappear on Dashboard, Events, and Calendar."
                : "It will reappear on Dashboard, Campaigns, Calendar, and Campaign Director.",
            confirmLabel: `Restore ${nounTitle}`,
            variant: "primary" as const,
          }
        : confirmAction === "delete"
          ? {
              title: `Delete this ${nounTitle} permanently?`,
              message:
                noun === "event"
                  ? "This removes the event and related workspace data. This cannot be undone. Prefer archive unless you need permanent removal."
                  : "This removes the campaign and all workspace data (drafts, versions, timeline steps, assets, approvals, schedules, and activity). This cannot be undone. Prefer archive unless you need permanent removal.",
              confirmLabel: "Delete permanently",
              variant: "danger" as const,
            }
          : null;

  const deleteConfirmed = deleteConfirmText === DELETE_CONFIRM_TEXT;

  return (
    <>
      <div className="relative">
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          size={size}
          disabled={isPending}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={iconOnly ? "Actions" : undefined}
          className={cn(triggerClassName)}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="h-4 w-4" />
          {iconOnly ? null : "Actions"}
        </Button>

        {menuOpen && mounted && menuCoords
          ? createPortal(
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[70] cursor-default bg-transparent"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="fixed z-[80] min-w-[14rem] rounded-xl border border-cos-border bg-cos-card py-1 shadow-lg"
                  style={{ top: menuCoords.top, left: menuCoords.left }}
                >
                  {includeEditDetails ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg focus-visible:bg-cos-bg focus-visible:outline-none"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 shrink-0" />
                      Edit details
                    </button>
                  ) : null}
                  {includeEditDetails ? (
                    <div className="my-1 border-t border-cos-border" role="separator" />
                  ) : null}
                  {archived ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg focus-visible:bg-cos-bg focus-visible:outline-none"
                      onClick={() => openConfirm("restore")}
                    >
                      <ArchiveRestore className="h-4 w-4 shrink-0" />
                      Restore {nounTitle}
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg focus-visible:bg-cos-bg focus-visible:outline-none"
                      onClick={() => openConfirm("archive")}
                    >
                      <span className="flex items-center gap-2">
                        <Archive className="h-4 w-4 shrink-0" />
                        Archive {nounTitle}
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
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-error-text hover:bg-cos-bg focus-visible:bg-cos-bg focus-visible:outline-none"
                    onClick={() => openConfirm("delete")}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Delete {nounTitle}
                  </button>
                </div>
              </>,
              document.body,
            )
          : null}
      </div>

      {editOpen ? (
        <EventEditDetailsDialog event={event} onClose={() => setEditOpen(false)} />
      ) : null}

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
