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
import { cn } from "@/lib/utils/cn";

interface CalendarSubscribeFeedPanelProps {
  initialData: SchoolYearSettingsData;
  /** Compact card for embedding on import / integrations pages. */
  variant?: "card" | "plain" | "ease";
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
  const ease = variant === "ease";

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

        router.push(`/calendar?tab=review&import=${result.importId}`);
        return;
      }

      setMessage("Calendar feed synced.");
      router.refresh();
    });
  }

  const body = (
    <div className="space-y-4">
      {variant === "card" || ease ? (
        <div>
          <h2
            className={cn(
              "font-display text-cos-text",
              ease
                ? "text-[22px] font-semibold tracking-[-0.02em]"
                : "text-xl",
            )}
          >
            Calendar subscribe feed
          </h2>
          <p
            className={cn(
              "mt-1.5 leading-relaxed text-cos-muted",
              ease ? "max-w-[46ch] text-[13px]" : "text-sm",
            )}
          >
            Paste your Google Calendar ICS (or webcal) URL. Save it, then sync —
            existing events are skipped so refreshes do not duplicate. New events
            also pull in daily at 6:00 AM UTC.
          </p>
          {activeSchoolYear ? (
            <p className="mt-1.5 text-xs font-semibold text-cos-muted">
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

      {ease ? (
        <label className="block space-y-2">
          <span className="block text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Calendar subscribe feed (ICS URL)
          </span>
          <input
            type="url"
            value={subscribeUrl}
            onChange={(event) => setSubscribeUrl(event.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/..."
            disabled={isPending || !activeSchoolYear}
            className="h-11 w-full rounded-full border border-cos-border bg-[rgba(255,252,247,0.85)] px-4 text-[13px] text-cos-text placeholder:text-cos-muted focus:border-cos-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="block text-xs text-cos-muted">
            Optional — Google Calendar secret ICS address or webcal:// URL.
          </span>
        </label>
      ) : (
        <Input
          label="Calendar subscribe feed (ICS URL)"
          value={subscribeUrl}
          onChange={(event) => setSubscribeUrl(event.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/..."
          hint="Optional — Google Calendar secret ICS address or webcal:// URL."
          disabled={isPending || !activeSchoolYear}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {ease ? (
          <>
            <button
              type="button"
              onClick={handleSaveSubscribeUrl}
              disabled={isPending || !activeSchoolYear}
              className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save subscribe feed"}
            </button>
            <button
              type="button"
              onClick={handleSyncSubscribeFeed}
              disabled={isPending || !activeSchoolYear || !canSyncFeed}
              className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px disabled:opacity-50"
            >
              {isPending ? "Syncing…" : "Sync calendar feed now"}
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
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
    <div
      className={cn(
        ease
          ? "rounded-[22px] border border-cos-border bg-cos-card p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
          : "rounded-2xl border border-cos-border bg-white p-6 shadow-sm",
      )}
    >
      {body}
    </div>
  );
}
