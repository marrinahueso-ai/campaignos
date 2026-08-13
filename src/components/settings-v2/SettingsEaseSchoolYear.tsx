"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { parseSchoolYearRange } from "@/lib/calendar-import/extract-date-lines";
import {
  closeSchoolYearAndBeginNextAction,
  saveCalendarSubscribeUrlAction,
  syncCalendarSubscribeFeedAction,
  type SchoolYearSettingsData,
} from "@/lib/school-years/actions";

interface SettingsEaseSchoolYearProps {
  initialData: SchoolYearSettingsData;
  /** When nested under Branding hub, hide the page-level School year H1. */
  embedded?: boolean;
}

const fieldControlClassName =
  "w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-3.5 py-[11px] text-sm text-[#2a2622] outline-none transition-[border-color,background,box-shadow] duration-100 focus:border-[rgba(47,74,60,0.35)] focus:bg-[#fffcf7] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.08)] disabled:opacity-60";

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

function formatSchoolYearDate(
  month: number,
  day: number,
  year: number,
): string {
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function schoolYearDateLabels(label: string | null | undefined): {
  starts: string;
  ends: string;
} {
  const range = parseSchoolYearRange(label);
  if (!range) {
    return { starts: "—", ends: "—" };
  }
  return {
    starts: formatSchoolYearDate(8, 1, range.startYear),
    ends: formatSchoolYearDate(7, 31, range.endYear),
  };
}

function SoftCard({
  title,
  description,
  headerAside,
  children,
}: {
  title: string;
  description: string;
  headerAside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            {title}
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            {description}
          </p>
        </div>
        {headerAside}
      </div>
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-[#5c554c]">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SettingsEaseSchoolYear({
  initialData,
  embedded = false,
}: SettingsEaseSchoolYearProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [nextYearLabel, setNextYearLabel] = useState("");
  const [subscribeUrl, setSubscribeUrl] = useState(
    data.activeSchoolYear?.calendarSubscribeUrl ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeLabel =
    data.activeSchoolYear?.label ?? data.organizationSchoolYearLabel ?? "Not set";
  const dates = schoolYearDateLabels(activeLabel);
  const isActive = data.activeSchoolYear?.status === "active";
  const savedSubscribeUrl =
    data.activeSchoolYear?.calendarSubscribeUrl?.trim() ?? "";
  const canSyncFeed =
    Boolean(savedSubscribeUrl) && subscribeUrl.trim() === savedSubscribeUrl;

  function handleSaveSubscribeUrl() {
    if (!data.activeSchoolYear) return;

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
          ? {
              ...current.activeSchoolYear,
              calendarSubscribeUrl: subscribeUrl,
            }
          : null,
      }));
    });
  }

  function handleSyncSubscribeFeed() {
    if (!data.activeSchoolYear) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await syncCalendarSubscribeFeedAction(
        data.activeSchoolYear!.id,
      );

      if (!result.success) {
        setError(result.error ?? "Unable to refresh calendar feed.");
        return;
      }

      if (result.importId) {
        if (result.added === 0 && result.skipped > 0) {
          setMessage("Feed refreshed — opening review.");
        } else if (result.skipped > 0) {
          setMessage(
            `Feed refreshed — ${result.added} new events ready to review (${result.skipped} already on calendar).`,
          );
        }
        router.push(`/calendar?tab=review&import=${result.importId}`);
        return;
      }

      setMessage("Calendar feed refreshed.");
    });
  }

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
      router.refresh();
    });
  }

  return (
    <section
      className="settings-ease-school-year"
      data-settings-ease="school-year"
    >
      {embedded ? null : (
        <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1
              className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              School year
            </h1>
            <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
              Active year scopes calendar, events, and import review.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <p
          className="mb-3.5 rounded-[14px] border border-[rgba(166,90,58,0.22)] bg-[rgba(166,90,58,0.12)] px-4 py-3 text-sm font-semibold text-[#a65a3a]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mb-3.5 rounded-[14px] border border-[rgba(47,74,60,0.18)] bg-[rgba(47,74,60,0.08)] px-4 py-3 text-sm font-semibold text-[#2f4a3c]">
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <SoftCard
          title="Active year"
          description="What the workspace is planning against right now."
          headerAside={
            isActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-current"
                  aria-hidden
                />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(122,113,102,0.12)] px-2.5 py-1 text-xs font-bold text-[#7a7166]">
                {data.activeSchoolYear?.status
                  ? data.activeSchoolYear.status.charAt(0).toUpperCase() +
                    data.activeSchoolYear.status.slice(1)
                  : "Not set"}
              </span>
            )
          }
        >
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[rgba(47,74,60,0.14)] bg-[rgba(47,74,60,0.08)] px-3.5 py-2 text-[13px] font-bold text-[#2f4a3c]">
            {activeLabel}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="sy-start" label="Start date">
              <input
                id="sy-start"
                type="text"
                value={dates.starts}
                readOnly
                className={fieldControlClassName}
              />
            </Field>
            <Field id="sy-end" label="End date">
              <input
                id="sy-end"
                type="text"
                value={dates.ends}
                readOnly
                className={fieldControlClassName}
              />
            </Field>
          </div>

          <Field id="sy-feed" label="Calendar subscribe URL">
            <input
              id="sy-feed"
              type="url"
              value={subscribeUrl}
              onChange={(event) => setSubscribeUrl(event.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
              disabled={isPending || !data.activeSchoolYear}
              className={fieldControlClassName}
            />
          </Field>

          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimaryClassName}
              onClick={handleSaveSubscribeUrl}
              disabled={isPending || !data.activeSchoolYear}
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={btnSecondaryClassName}
              onClick={handleSyncSubscribeFeed}
              disabled={isPending || !data.activeSchoolYear || !canSyncFeed}
            >
              Refresh calendar feed
            </button>
          </div>
        </SoftCard>

        <SoftCard
          title="Close & begin next"
          description="Archive this year when you’re ready for the next one."
        >
          <Field id="next-year" label="Next year label">
            <input
              id="next-year"
              type="text"
              value={nextYearLabel}
              onChange={(event) => setNextYearLabel(event.target.value)}
              placeholder="2026–27"
              disabled={isPending}
              className={fieldControlClassName}
            />
          </Field>
          <p className="mb-3.5 mt-0 text-[13px] leading-snug text-[#5c554c]">
            Closing keeps past events for reference. Upload the new calendar
            after you begin the next year.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondaryClassName}
              onClick={handleCloseYear}
              disabled={isPending || !nextYearLabel.trim()}
            >
              Close year & begin next
            </button>
          </div>
        </SoftCard>
      </div>
    </section>
  );
}
