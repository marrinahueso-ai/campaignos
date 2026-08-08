"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Megaphone,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getCalendarEventDrawerDetailAction,
  getCalendarItemPreviewAction,
} from "@/lib/communications-calendar/calendar-item-preview-actions";
import type {
  CalendarEventDrawerDetail,
  CalendarItemPreview,
} from "@/lib/communications-calendar/calendar-item-preview";
import {
  campaignBuilderHref,
  campaignBuilderPreviewMilestoneHref,
} from "@/lib/campaign-builder-v2/navigation";
import {
  archiveEventAction,
  deleteEventAction,
} from "@/lib/events/actions";
import { eventInsightsHref } from "@/lib/events/event-responsibility";
import { cn } from "@/lib/utils/cn";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

const DELETE_CONFIRM_TEXT = "DELETE";

type ConfirmAction = "archive" | "delete" | null;

type DrawerKind = "event" | "scheduled" | "published";

type EnrichedItem = PlanningCalendarItem & {
  isOverdue?: boolean;
  isToday?: boolean;
};

interface PlanningCalendarDetailPanelProps {
  item: EnrichedItem;
  /** Other calendar chips for the same event (upcoming posts summary). */
  relatedItems?: EnrichedItem[];
  onClose: () => void;
  /** Select another chip without leaving the calendar (upcoming posts). */
  onSelectItem?: (item: EnrichedItem) => void;
}

function isSchoolEventItem(item: PlanningCalendarItem): boolean {
  return item.sourceType === "event" || item.communicationType === "event";
}

function isPostItem(item: PlanningCalendarItem): boolean {
  return (
    item.communicationType === "meta_milestone" ||
    item.communicationType === "scheduled_post" ||
    item.sourceType === "meta_milestone" ||
    item.sourceType === "scheduled_post"
  );
}

function resolveDrawerKind(item: PlanningCalendarItem): DrawerKind {
  if (isSchoolEventItem(item)) return "event";
  const status = (item.publishStatus ?? item.status ?? "").toLowerCase();
  if (status === "published" || status === "posted") return "published";
  return "scheduled";
}

function formatDisplayDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortWhen(item: EnrichedItem): string {
  if (item.scheduledAt) {
    return new Date(item.scheduledAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return new Date(`${item.scheduledDate}T12:00:00`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" },
  );
}

function eventStatusLabel(status: string): string {
  switch (status) {
    case "published":
      return "Confirmed";
    case "scheduled":
      return "Scheduled";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}

function deliveryLabel(method: string | null): string {
  switch (method) {
    case "auto-publish":
    case "schedule":
      return "Auto-post";
    case "publish-now":
      return "Publish now";
    case "manual-email":
      return "Manual email";
    case "draft-only":
      return "Draft only";
    default:
      return method?.trim() || "—";
  }
}

function PlatformIcons({ platforms }: { platforms: string[] }) {
  const set = new Set(platforms.map((p) => p.toLowerCase()));
  return (
    <div className="flex items-center gap-3 pt-1 text-[#1c352d]">
      {set.has("instagram") ? (
        <InstagramIcon className="h-5 w-5" aria-label="Instagram" />
      ) : null}
      {set.has("facebook") ? (
        <FacebookIcon className="h-5 w-5" aria-label="Facebook" />
      ) : null}
      {set.has("email") ? <Mail className="h-5 w-5" aria-label="Email" /> : null}
      {set.size === 0 ? (
        <span className="text-sm text-[#5e6b65]">—</span>
      ) : null}
    </div>
  );
}

export function PlanningCalendarDetailPanel({
  item,
  relatedItems = [],
  onClose,
  onSelectItem,
}: PlanningCalendarDetailPanelProps) {
  const router = useRouter();
  const kind = resolveDrawerKind(item);
  const [preview, setPreview] = useState<CalendarItemPreview | null>(null);
  const [eventDetail, setEventDetail] =
    useState<CalendarEventDrawerDetail | null>(null);
  const [isPending, startTransition] = useTransition();
  const [managePending, startManageTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [manageError, setManageError] = useState<string | null>(null);
  const [artSlide, setArtSlide] = useState(0);

  useEffect(() => {
    setPreview(null);
    setEventDetail(null);
    setConfirmAction(null);
    setDeleteConfirmText("");
    setManageError(null);
    setArtSlide(0);

    let cancelled = false;
    startTransition(async () => {
      if (kind === "event") {
        const detail = await getCalendarEventDrawerDetailAction(item.eventId);
        if (!cancelled) setEventDetail(detail);
        return;
      }
      const result = await getCalendarItemPreviewAction({
        eventId: item.eventId,
        sourceId: item.sourceId,
        milestoneTitle: item.timelineStepTitle ?? item.title,
        scheduledAt: item.scheduledAt ?? null,
      });
      if (!cancelled) setPreview(result);
    });

    return () => {
      cancelled = true;
    };
  }, [item, kind]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmAction) {
          setConfirmAction(null);
          return;
        }
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, confirmAction]);

  const upcomingPosts = useMemo(() => {
    return relatedItems
      .filter((entry) => isPostItem(entry))
      .filter((entry) => {
        const status = (entry.publishStatus ?? entry.status ?? "").toLowerCase();
        return status !== "published" && status !== "posted";
      })
      .sort((a, b) =>
        (a.scheduledAt ?? a.scheduledDate).localeCompare(
          b.scheduledAt ?? b.scheduledDate,
        ),
      )
      .slice(0, 5);
  }, [relatedItems]);

  const postTitle = item.timelineStepTitle ?? item.title;
  const canManageEvent = isSchoolEventItem(item);
  const deleteConfirmed = deleteConfirmText === DELETE_CONFIRM_TEXT;

  const openPostHref = useMemo(() => {
    const milestoneId = preview?.campaignMilestoneId?.trim();
    if (milestoneId) {
      return campaignBuilderPreviewMilestoneHref(item.eventId, milestoneId);
    }
    return campaignBuilderHref(item.eventId, "preview");
  }, [item.eventId, preview?.campaignMilestoneId]);

  const insightsHref = eventInsightsHref(item.eventId);
  const openEventHref = `/events/${encodeURIComponent(item.eventId)}`;

  const feedUrl = preview?.preview.feedArtworkUrl ?? null;
  const storyUrl = preview?.preview.storyArtworkUrl ?? null;
  const artSlides = [
    ...(feedUrl ? [{ url: feedUrl, label: "Feed 1:1" as const }] : []),
    ...(storyUrl ? [{ url: storyUrl, label: "Story 9:16" as const }] : []),
  ];

  function openConfirm(action: ConfirmAction) {
    setConfirmAction(action);
    setDeleteConfirmText("");
    setManageError(null);
  }

  function closeConfirm() {
    if (!managePending) {
      setConfirmAction(null);
      setDeleteConfirmText("");
      setManageError(null);
    }
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction === "delete" && deleteConfirmText !== DELETE_CONFIRM_TEXT) {
      return;
    }

    setManageError(null);
    const eventId = item.eventId;

    startManageTransition(async () => {
      if (confirmAction === "archive") {
        const result = await archiveEventAction(eventId);
        if (!result.success) {
          setManageError(result.error ?? "Unable to archive event.");
          return;
        }
      } else if (confirmAction === "delete") {
        const result = await deleteEventAction(eventId);
        if (!result.success) {
          setManageError(
            result.error ??
              "Unable to delete event. It may still be linked to other records.",
          );
          return;
        }
      }

      setConfirmAction(null);
      setDeleteConfirmText("");
      onClose();
      router.refresh();
    });
  }

  const confirmCopy =
    confirmAction === "archive"
      ? {
          title: "Archive this event?",
          message:
            "Recommended when you’re done with active work. The event stays available by direct link and can be restored anytime.",
          confirmLabel: "Archive event",
          variant: "primary" as const,
        }
      : confirmAction === "delete"
        ? {
            title: "Delete this event permanently?",
            message:
              "This removes the event and related workspace data. This cannot be undone. Prefer archive unless you need permanent removal.",
            confirmLabel: "Delete permanently",
            variant: "danger" as const,
          }
        : null;

  const closeOnArt =
    kind !== "event" && artSlides.length > 0
      ? "text-white hover:bg-white/20"
      : "text-[#5e6b65] hover:bg-[#f4f0ea]";

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col overflow-hidden rounded-l-3xl border-l border-[#e6dfd5] bg-white shadow-[-12px_0_40px_rgba(28,53,45,0.12)]"
      role="dialog"
      aria-modal="true"
      aria-label="Calendar detail"
    >
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "absolute top-6 right-6 z-20 rounded-full p-2 transition",
          closeOnArt,
        )}
        aria-label="Close detail panel"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto pb-36">
        {kind === "event" ? (
          <EventDrawerBody
            item={item}
            eventDetail={eventDetail}
            loading={isPending && !eventDetail}
            upcomingPosts={upcomingPosts}
            onSelectPost={onSelectItem}
          />
        ) : null}

        {kind === "scheduled" ? (
          <PostDrawerBody
            kind="scheduled"
            item={item}
            postTitle={postTitle}
            preview={preview}
            loading={isPending && !preview}
            artSlides={artSlides}
            artSlide={artSlide}
            onArtSlide={setArtSlide}
          />
        ) : null}

        {kind === "published" ? (
          <PostDrawerBody
            kind="published"
            item={item}
            postTitle={postTitle}
            preview={preview}
            loading={isPending && !preview}
            artSlides={artSlides}
            artSlide={artSlide}
            onArtSlide={setArtSlide}
            insightsHref={insightsHref}
          />
        ) : null}
      </div>

      <div className="absolute right-0 bottom-0 left-0 border-t border-[#e6dfd5] bg-white/95 px-8 py-5 backdrop-blur">
        {kind === "event" ? (
          <div className="space-y-2">
            <Link
              href={openEventHref}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1c352d] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#5e6b65]"
            >
              Open Event
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
            {canManageEvent ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={managePending}
                  onClick={() => openConfirm("archive")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#e6dfd5] py-2.5 text-xs font-semibold text-[#5e6b65]"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </button>
                <button
                  type="button"
                  disabled={managePending}
                  onClick={() => openConfirm("delete")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#e6dfd5] py-2.5 text-xs font-semibold text-[#a65a3a]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {kind === "scheduled" ? (
          <Link
            href={openPostHref}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1c352d] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#5e6b65]"
          >
            Open Post
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}

        {kind === "published" ? (
          <div className="space-y-2">
            <Link
              href={openPostHref}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1c352d] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#5e6b65]"
            >
              View Post Details
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={insightsHref}
              className="flex w-full items-center justify-center rounded-full border border-[#e6dfd5] py-3 text-xs font-bold tracking-wider text-[#5a7568] uppercase"
            >
              View Insights
            </Link>
          </div>
        ) : null}
      </div>

      {confirmAction && confirmCopy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c352d]/25 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-manage-confirm-title"
            className="w-full max-w-md rounded-2xl border border-[#e6dfd5] bg-white p-6 shadow-xl"
          >
            <h2
              id="calendar-event-manage-confirm-title"
              className="text-lg font-semibold text-[#1c352d]"
            >
              {confirmCopy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5e6b65]">
              {confirmCopy.message}
            </p>
            {confirmAction === "delete" ? (
              <div className="mt-4">
                <Input
                  label={`Type ${DELETE_CONFIRM_TEXT} to confirm`}
                  value={deleteConfirmText}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={managePending}
                  placeholder={DELETE_CONFIRM_TEXT}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                />
              </div>
            ) : null}
            {manageError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {manageError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={managePending}
                onClick={closeConfirm}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmCopy.variant}
                disabled={
                  managePending ||
                  (confirmAction === "delete" && !deleteConfirmed)
                }
                onClick={handleConfirm}
              >
                {managePending ? "Working…" : confirmCopy.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function EventDrawerBody({
  item,
  eventDetail,
  loading,
  upcomingPosts,
  onSelectPost,
}: {
  item: EnrichedItem;
  eventDetail: CalendarEventDrawerDetail | null;
  loading: boolean;
  upcomingPosts: EnrichedItem[];
  onSelectPost?: (item: EnrichedItem) => void;
}) {
  const status = eventDetail?.status ?? item.status;
  return (
    <>
      <div className="px-8 pt-10 pb-6">
        <span className="mb-4 inline-block rounded bg-[#e6efe9] px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#5a7568] uppercase">
          Event
        </span>
        <h2 className="font-display text-3xl leading-tight text-[#1c352d]">
          {item.title}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6dfd5] px-3 py-1 text-xs font-medium text-[#5e6b65]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {eventStatusLabel(status)}
          </span>
        </div>
      </div>

      <div className="space-y-6 px-8">
        {loading ? (
          <p className="text-sm text-[#5e6b65]">Loading event details…</p>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <MetaField label="Date" value={formatDisplayDate(item.scheduledDate)} />
          <MetaField
            label="Time"
            value={eventDetail?.time?.trim() || "—"}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold tracking-wider text-[#5e6b65] uppercase">
            Location
          </span>
          <p className="flex items-center gap-2 text-sm font-medium text-[#1c352d]">
            <MapPin className="h-4 w-4 text-[#c5a880]" aria-hidden />
            {eventDetail?.location?.trim() || "—"}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold tracking-wider text-[#5e6b65] uppercase">
            Communication Plan
          </span>
          <p className="flex items-center gap-2 text-sm font-medium text-[#5a7568]">
            <Megaphone className="h-4 w-4 text-[#c5a880]" aria-hidden />
            {eventDetail?.communicationPlanLabel ?? "—"}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-[#e6dfd5] bg-[#faf8f5] p-5">
          <h4 className="mb-4 flex items-center justify-between text-xs font-bold tracking-widest text-[#1c352d] uppercase">
            Upcoming Posts
            <span className="text-[10px] font-normal text-[#5e6b65]">
              {upcomingPosts.length} scheduled
            </span>
          </h4>
          {upcomingPosts.length === 0 ? (
            <p className="text-xs text-[#5e6b65]">
              No scheduled posts on the calendar for this event yet.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectPost?.(post)}
                  className="flex w-full items-center gap-3 text-left transition hover:opacity-80"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e6dfd5]/60 text-[10px] font-bold text-[#5e6b65]">
                    Post
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#1c352d]">
                      {post.timelineStepTitle ?? post.title}
                    </p>
                    <p className="text-[10px] text-[#5e6b65]">
                      {formatShortWhen(post)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PostDrawerBody({
  kind,
  item,
  postTitle,
  preview,
  loading,
  artSlides,
  artSlide,
  onArtSlide,
  insightsHref,
}: {
  kind: "scheduled" | "published";
  item: EnrichedItem;
  postTitle: string;
  preview: CalendarItemPreview | null;
  loading: boolean;
  artSlides: Array<{ url: string; label: string }>;
  artSlide: number;
  onArtSlide: (index: number) => void;
  insightsHref?: string;
}) {
  const caption =
    preview?.preview.captionText ??
    preview?.preview.storyCaptionSnippet ??
    null;
  const activeArt = artSlides[Math.min(artSlide, Math.max(artSlides.length - 1, 0))];
  const heroUrl = artSlides[0]?.url ?? null;

  return (
    <>
      {kind === "scheduled" ? (
        <div className="relative bg-[#1c352d]">
          {artSlides.length > 0 && activeArt ? (
            <div className="aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeArt.url}
                alt=""
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute bottom-4 left-4">
                <span className="rounded bg-black/50 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm">
                  {activeArt.label}
                </span>
              </div>
              {artSlides.length > 1 ? (
                <div className="absolute right-4 bottom-4 flex gap-1.5">
                  {artSlides.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Artwork ${index + 1}`}
                      onClick={() => onArtSlide(index)}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        index === artSlide ? "bg-white" : "bg-white/40",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center bg-[#f4f0ea] px-6 text-center text-sm text-[#5e6b65]">
              {loading ? "Loading artwork…" : "No artwork attached yet"}
            </div>
          )}
        </div>
      ) : (
        <div className="relative aspect-square overflow-hidden bg-[#f4f0ea]">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#5e6b65]">
              {loading ? "Loading artwork…" : "No artwork attached yet"}
            </div>
          )}
        </div>
      )}

      <div className="px-8 pt-8 pb-6">
        <span
          className={cn(
            "mb-4 inline-block rounded px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase",
            kind === "scheduled"
              ? "bg-[#ece2d4] text-[#1c352d]"
              : "bg-[#1c352d] text-white",
          )}
        >
          {kind === "scheduled" ? "Scheduled" : "Published"}
        </span>
        <h2 className="font-display text-2xl leading-tight text-[#1c352d]">
          {postTitle}
        </h2>
        <p className="mt-1.5 text-sm text-[#5e6b65]">
          Part of{" "}
          <Link
            href={`/events/${encodeURIComponent(item.eventId)}`}
            className="font-semibold text-[#1c352d] hover:underline"
          >
            {item.eventTitle}
          </Link>
        </p>
      </div>

      <div className="space-y-6 px-8">
        <div className="grid grid-cols-2 gap-4">
          <MetaField
            label={kind === "scheduled" ? "Scheduled Date" : "Published On"}
            value={
              preview?.scheduleLabel ??
              formatShortWhen(item)
            }
          />
          <div className="space-y-1">
            <span className="text-[10px] font-semibold tracking-wider text-[#5e6b65] uppercase">
              {kind === "scheduled" ? "Delivery" : "Status"}
            </span>
            {kind === "scheduled" ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-[#1c352d]">
                <Send className="h-4 w-4 text-[#c5a880]" aria-hidden />
                {deliveryLabel(preview?.deliveryMethod ?? null)}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Successfully sent
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold tracking-wider text-[#5e6b65] uppercase">
            Platforms
          </span>
          <PlatformIcons platforms={preview?.platforms ?? []} />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-semibold tracking-wider text-[#5e6b65] uppercase">
            Caption
          </span>
          <div
            className={cn(
              "rounded-xl border border-[#e6dfd5] bg-[#faf8f5] p-4 text-sm leading-relaxed text-[#1c352d]",
              kind === "published" && "opacity-80",
            )}
          >
            {caption?.trim() ||
              (loading ? "Loading caption…" : "No caption yet.")}
          </div>
        </div>

        {kind === "published" && insightsHref ? (
          <Link
            href={insightsHref}
            className="group mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#5a7568] transition hover:text-[#1c352d]"
          >
            View full post insights
            <span className="transition group-hover:translate-x-0.5">→</span>
          </Link>
        ) : null}
      </div>
    </>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold tracking-wider text-[#5e6b65] uppercase">
        {label}
      </span>
      <p className="text-sm font-medium text-[#1c352d]">{value}</p>
    </div>
  );
}
