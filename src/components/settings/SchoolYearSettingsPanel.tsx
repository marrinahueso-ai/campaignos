"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  activateSchoolYearAction,
  closeSchoolYearAndBeginNextAction,
  saveCalendarSubscribeUrlAction,
  syncCalendarSubscribeFeedAction,
  type SchoolYearSettingsData,
} from "@/lib/school-years/actions";
import { clearCalendarWindowEventsAction } from "@/lib/calendar-import/actions";

interface SchoolYearSettingsPanelProps {
  initialData: SchoolYearSettingsData;
}

export function SchoolYearSettingsPanel({ initialData }: SchoolYearSettingsPanelProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [nextYearLabel, setNextYearLabel] = useState("");
  const [subscribeUrl, setSubscribeUrl] = useState(
    data.activeSchoolYear?.calendarSubscribeUrl ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCloseYear() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await closeSchoolYearAndBeginNextAction({
        nextYearLabel,
        calendarSubscribeUrl: subscribeUrl,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(
        `Closed the prior year. ${nextYearLabel} is ready — upload the new calendar when you are.`,
      );
      setNextYearLabel("");
    });
  }

  function handleSaveSubscribeUrl() {
    if (!data.activeSchoolYear) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await saveCalendarSubscribeUrlAction(
        data.activeSchoolYear!.id,
        subscribeUrl,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage("Calendar subscribe feed saved.");
      setData((current) => ({
        ...current,
        activeSchoolYear: current.activeSchoolYear
          ? { ...current.activeSchoolYear, calendarSubscribeUrl: subscribeUrl }
          : null,
      }));
    });
  }

  function handleSyncSubscribeFeed() {
    if (!data.activeSchoolYear) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await syncCalendarSubscribeFeedAction(data.activeSchoolYear!.id);

      if (!result.success) {
        setError(result.error ?? "Unable to sync calendar feed.");
        return;
      }

      if (result.importId) {
        if (result.added === 0 && result.skipped > 0) {
          setMessage(
            `Feed synced — all ${result.skipped} events are already on your calendar.`,
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
    });
  }

  function handleClearCalendar() {
    const eventLabel =
      data.activeSchoolYear?.label ?? data.organizationSchoolYearLabel ?? "your calendar";
    const confirmed = window.confirm(
      `Remove all calendar and campaign events for ${eventLabel}? This cannot be undone. Sync your feed or upload a PDF afterward.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await clearCalendarWindowEventsAction();
      if (!result.success) {
        setError(result.error ?? "Unable to clear calendar events.");
        return;
      }

      setMessage(
        result.deletedCount > 0
          ? `Cleared ${result.deletedCount} calendar events for ${eventLabel}.`
          : "Calendar is already empty.",
      );
      router.refresh();
    });
  }

  function handleActivateYear(schoolYearId: string) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await activateSchoolYearAction(schoolYearId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("Active school year updated.");
    });
  }

  const activeLabel =
    data.activeSchoolYear?.label ?? data.organizationSchoolYearLabel ?? "Not set";

  const savedSubscribeUrl = data.activeSchoolYear?.calendarSubscribeUrl?.trim() ?? "";
  const canSyncFeed =
    Boolean(savedSubscribeUrl) && subscribeUrl.trim() === savedSubscribeUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>School year & calendar</CardTitle>
        <CardDescription>
          Close the prior year, start the next, and upload a fresh calendar. CampaignOS
          remembers how you categorized events last time.
        </CardDescription>
      </CardHeader>

      <div className="space-y-6 px-6 pb-6">
        <div className="border border-cos-border bg-cos-bg/40 p-4">
          <p className="cos-section-title">Current school year</p>
          <p className="font-display mt-2 text-3xl text-cos-text">{activeLabel}</p>
          {data.activeSchoolYear && (
            <p className="mt-1 text-xs capitalize text-cos-muted">
              Status: {data.activeSchoolYear.status}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Input
            label="Calendar subscribe feed (ICS URL)"
            value={subscribeUrl}
            onChange={(event) => setSubscribeUrl(event.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/..."
            hint="Optional — Google Calendar ICS or webcal:// URLs. New events auto-import daily at 6:00 AM UTC. Use Sync now for an immediate pull to review."
            disabled={isPending || !data.activeSchoolYear}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveSubscribeUrl}
              disabled={isPending || !data.activeSchoolYear}
            >
              Save subscribe feed
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSyncSubscribeFeed}
              disabled={isPending || !data.activeSchoolYear || !canSyncFeed}
            >
              Sync calendar feed now
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-red-700 hover:bg-red-50"
              onClick={handleClearCalendar}
              disabled={isPending || !data.activeSchoolYear}
            >
              Clear calendar for this school year
            </Button>
          </div>
        </div>

        <div className="space-y-3 border border-cos-border p-4">
          <p className="font-display text-xl text-cos-text">Start next school year</p>
          <p className="text-sm text-cos-muted">
            Closes the active year and opens a new planning year. Your playbook
            categorization memory carries forward to the next calendar upload.
          </p>
          <Input
            label="New school year label"
            value={nextYearLabel}
            onChange={(event) => setNextYearLabel(event.target.value)}
            placeholder="2026–2027"
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleCloseYear}
              disabled={isPending || !nextYearLabel.trim()}
            >
              Close prior year & begin next
            </Button>
            <Button href="/calendar/import" variant="secondary" disabled={isPending}>
              Upload new calendar
            </Button>
          </div>
        </div>

        {data.schoolYears.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-cos-text">All school years</p>
            <ul className="space-y-2">
              {data.schoolYears.map((year) => (
                <li
                  key={year.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cos-border px-3 py-2 text-sm"
                >
                  <span>
                    {year.label}{" "}
                    <span className="capitalize text-cos-muted">({year.status})</span>
                  </span>
                  {year.status !== "active" && year.status !== "closed" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleActivateYear(year.id)}
                      disabled={isPending}
                    >
                      Set active
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <p className="text-sm text-cos-muted">
          Need the full setup wizard?{" "}
          <Link href="/settings/school-setup" className="font-medium text-cos-text hover:underline">
            School setup
          </Link>
        </p>
      </div>
    </Card>
  );
}
