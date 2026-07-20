"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  saveCalendarSubscribeUrlAction,
  syncCalendarSubscribeFeedAction,
  type SchoolYearSettingsData,
} from "@/lib/school-years/actions";

interface CalendarSubscribeFeedPanelProps {
  initialData: SchoolYearSettingsData;
  /** Compact card for embedding on import / integrations pages. */
  variant?: "card" | "plain";
}

export function CalendarSubscribeFeedPanel({
  initialData,
  variant = "card",
}: CalendarSubscribeFeedPanelProps) {
  const router = useRouter();
  const [activeSchoolYear, setActiveSchoolYear] = useState(
    initialData.activeSchoolYear,
  );
  const [subscribeUrl, setSubscribeUrl] = useState(
    activeSchoolYear?.calendarSubscribeUrl ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const savedSubscribeUrl = activeSchoolYear?.calendarSubscribeUrl?.trim() ?? "";
  const canSyncFeed =
    Boolean(savedSubscribeUrl) && subscribeUrl.trim() === savedSubscribeUrl;

  function handleSaveSubscribeUrl() {
    if (!activeSchoolYear) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await saveCalendarSubscribeUrlAction(
        activeSchoolYear.id,
        subscribeUrl,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage("Calendar subscribe feed saved.");
      setActiveSchoolYear((current) =>
        current
          ? { ...current, calendarSubscribeUrl: subscribeUrl.trim() || null }
          : current,
      );
      router.refresh();
    });
  }

  function handleSyncSubscribeFeed() {
    if (!activeSchoolYear) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await syncCalendarSubscribeFeedAction(activeSchoolYear.id);

      if (!result.success) {
        setError(result.error ?? "Unable to sync calendar feed.");
        return;
      }

      if (result.importId) {
        if (result.added === 0 && result.skipped > 0) {
          setMessage(
            `Feed synced — all ${result.skipped} events are already on your calendar (no duplicates added).`,
          );
          router.refresh();
          return;
        }

        if (result.skipped > 0) {
          setMessage(
            `Feed synced — ${result.added} new events ready to review (${result.skipped} already on calendar).`,
          );
        }

        router.push(`/calendar/review?import=${result.importId}`);
        return;
      }

      setMessage("Calendar feed synced.");
      router.refresh();
    });
  }

  const body = (
    <div className="space-y-4">
      {variant === "card" ? (
        <div>
          <h2 className="font-display text-xl text-cos-text">
            Calendar subscribe feed
          </h2>
          <p className="mt-1 text-sm text-cos-muted">
            Paste your Google Calendar ICS (or webcal) URL. Save it, then sync —
            existing events are skipped so refreshes do not duplicate. New events
            also pull in daily at 6:00 AM UTC.
          </p>
          {activeSchoolYear ? (
            <p className="mt-1 text-xs text-cos-muted">
              Active school year: {activeSchoolYear.label}
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-800">
              Finish school setup so an active school year exists before linking a
              feed.
            </p>
          )}
        </div>
      ) : !activeSchoolYear ? (
        <p className="text-sm text-amber-800">
          Finish school setup so an active school year exists before linking a
          feed.
        </p>
      ) : null}

      <Input
        label="Calendar subscribe feed (ICS URL)"
        value={subscribeUrl}
        onChange={(event) => setSubscribeUrl(event.target.value)}
        placeholder="https://calendar.google.com/calendar/ical/..."
        hint="Optional — Google Calendar secret ICS address or webcal:// URL."
        disabled={isPending || !activeSchoolYear}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleSaveSubscribeUrl}
          disabled={isPending || !activeSchoolYear}
        >
          {isPending ? "Saving…" : "Save subscribe feed"}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSyncSubscribeFeed}
          disabled={isPending || !activeSchoolYear || !canSyncFeed}
        >
          {isPending ? "Syncing…" : "Sync calendar feed now"}
        </Button>
      </div>

      {!canSyncFeed && subscribeUrl.trim() && activeSchoolYear ? (
        <p className="text-xs text-cos-muted">
          Save the feed URL before syncing.
        </p>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );

  if (variant === "plain") {
    return body;
  }

  return (
    <div className="rounded-2xl border border-cos-border bg-white p-6 shadow-sm">
      {body}
    </div>
  );
}
