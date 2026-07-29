"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  disconnectGoogleCalendarAction,
  syncGoogleCalendarAction,
} from "@/lib/google-calendar/actions";
import { buildOAuthStartPath } from "@/lib/integrations/oauth";
import {
  saveCalendarSubscribeUrlAction,
  type SchoolYearSettingsData,
} from "@/lib/school-years/actions";

interface SettingsEaseCalendarProps {
  connected: boolean;
  integrationConfigured: boolean;
  accountEmail: string | null;
  hasActiveSchoolYear: boolean;
  activeSchoolYearId: string | null;
  initialSubscribeUrl: string;
  oauthError: string | null;
  bannerMessage: string | null;
  bannerTone: "success" | "error" | null;
}

const fieldControlClassName =
  "w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-3.5 py-[11px] text-sm text-[#2a2622] outline-none transition-[border-color,background,box-shadow] duration-100 focus:border-[rgba(47,74,60,0.35)] focus:bg-[#fffcf7] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.08)] disabled:opacity-60";

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnGhostClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-transparent px-[18px] py-[11px] text-[13px] font-bold text-[#7a7166] transition-colors duration-100 hover:text-[#2a2622] disabled:cursor-not-allowed disabled:opacity-60";

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "off";
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        tone === "ok"
          ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]"
          : "inline-flex items-center gap-1.5 rounded-full bg-[rgba(122,113,102,0.12)] px-2.5 py-1 text-xs font-bold text-[#7a7166]"
      }
    >
      {tone === "ok" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

function HonestList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 mb-0 flex list-none flex-col gap-2 p-0">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#5c554c]"
        >
          <span
            className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full bg-[#6b8171]"
            aria-hidden
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

function oauthErrorMessage(code: string): string {
  switch (code) {
    case "not_configured":
      return "Google Calendar isn't configured on this server yet.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    case "token_exchange_failed":
    case "save_failed":
      return "Could not finish connecting. Please try again.";
    case "invalid_state":
    case "missing_code":
      return "That sign-in link expired. Try again.";
    default:
      return "Could not connect Google Calendar. Please try again.";
  }
}

export function SettingsEaseCalendar({
  connected,
  integrationConfigured,
  accountEmail,
  hasActiveSchoolYear,
  activeSchoolYearId,
  initialSubscribeUrl,
  oauthError,
  bannerMessage,
  bannerTone,
}: SettingsEaseCalendarProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    oauthError ? oauthErrorMessage(oauthError) : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [subscribeUrl, setSubscribeUrl] = useState(initialSubscribeUrl);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [isSavingFeed, startSaveTransition] = useTransition();

  const connectHref = buildOAuthStartPath("google", {
    returnTo: "/settings/integrations/calendar",
  });

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disconnectGoogleCalendarAction();
      if (!result.success) {
        setError(result.error ?? "Could not disconnect.");
        return;
      }
      setMessage("Google Calendar disconnected.");
      router.refresh();
    });
  }

  function handleSync() {
    setError(null);
    setMessage(null);
    startSyncTransition(async () => {
      const result = await syncGoogleCalendarAction();
      if (!result.success) {
        setError(result.error ?? "Refresh failed.");
        return;
      }
      if ((result.added ?? 0) === 0) {
        setMessage(
          result.skipped
            ? `You're up to date — ${result.skipped} event${result.skipped === 1 ? "" : "s"} already on the calendar.`
            : "You're up to date. No new events to review.",
        );
      } else if (result.importId) {
        router.push(`/calendar?tab=review&import=${result.importId}`);
        return;
      }
      router.refresh();
    });
  }

  function handleSaveFeed() {
    if (!activeSchoolYearId) {
      setError("Set an active school year before saving a calendar feed.");
      return;
    }

    setError(null);
    setMessage(null);
    startSaveTransition(async () => {
      const result = await saveCalendarSubscribeUrlAction(
        activeSchoolYearId,
        subscribeUrl,
      );
      if (!result.success) {
        setError(result.error ?? "Could not save subscribe feed.");
        return;
      }
      setMessage("Calendar subscribe feed saved.");
      router.refresh();
    });
  }

  return (
    <section data-settings-ease="calendar">
      <Link
        href="/settings/integrations"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#5c554c] transition-colors hover:text-[#2a2622]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M15 18 9 12l6-6" />
        </svg>
        Integrations
      </Link>

      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Google Calendar
          </h1>
          <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
            Sign in to bring events in. Upload a file and review New / Duplicate
            / Update / Conflict on Calendar → Import.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={connected ? "ok" : "off"}>
            {connected ? "Connected" : "Not connected"}
          </StatusPill>
        </div>
      </div>

      {bannerMessage ? (
        <p
          className={
            bannerTone === "success"
              ? "mb-3.5 text-sm text-emerald-700"
              : "mb-3.5 text-sm text-red-600"
          }
          role="status"
        >
          {bannerMessage}
        </p>
      ) : null}

      <div className="mb-3.5 rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[linear-gradient(135deg,rgba(47,74,60,0.06),transparent_55%),#fffcf7] px-[26px] py-7 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        {connected ? (
          <>
            <h2
              className="m-0 text-[26px] font-semibold tracking-[-0.02em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Signed in with Google
            </h2>
            <p className="mt-2 mb-0 max-w-[48ch] text-sm leading-[1.5] text-[#5c554c]">
              {accountEmail ?? "Google account"}
              {" · daily refresh keeps your year calendar up to date."}
            </p>
            <HonestList
              items={[
                "One-click Google Sign-in → allow calendar access → review new dates",
                "Subscribe link and file upload remain available on Calendar → Import",
                "Needs an active school year before new events can land",
              ]}
            />
            <div className="mt-[18px] flex flex-wrap gap-2">
              <button
                type="button"
                className={btnPrimaryClassName}
                disabled={isSyncing || isPending || !hasActiveSchoolYear}
                onClick={handleSync}
              >
                {isSyncing ? "Refreshing…" : "Refresh calendar"}
              </button>
              <Link
                href="/calendar?tab=import"
                className={btnSecondaryClassName}
              >
                Open Import
              </Link>
              <button
                type="button"
                className={btnGhostClassName}
                disabled={isPending}
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
            {!hasActiveSchoolYear ? (
              <p className="mt-3 mb-0 text-sm text-amber-800">
                Set an active school year in School year settings before
                refreshing.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h2
              className="m-0 text-[26px] font-semibold tracking-[-0.02em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Sign in with Google
            </h2>
            <p className="mt-2 mb-0 max-w-[48ch] text-sm leading-[1.5] text-[#5c554c]">
              One click. Allow calendar access. Bring events into Hey Ralli
              review.
            </p>
            <HonestList
              items={[
                "One-click Google Sign-in → allow calendar access → review new dates",
                "Subscribe link and file upload remain available on Calendar → Import",
                "Needs an active school year before new events can land",
              ]}
            />
            <div className="mt-[18px] flex flex-wrap gap-2">
              {integrationConfigured ? (
                <a href={connectHref} className={btnPrimaryClassName}>
                  Sign in with Google
                </a>
              ) : (
                <p className="mb-0 text-sm text-[#5c554c]">
                  Google Calendar sign-in isn&apos;t set up on this server yet.
                  You can still save a subscribe link below or upload a file on
                  Import.
                </p>
              )}
              <Link
                href="/calendar?tab=import"
                className={btnSecondaryClassName}
              >
                Open Import
              </Link>
            </div>
          </>
        )}

        {error ? (
          <p className="mt-3 mb-0 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 mb-0 text-sm text-emerald-700" role="status">
            {message}
          </p>
        ) : null}
      </div>

      <div className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <div className="mb-3.5">
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Subscribe feed
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            Optional calendar feed link saved on the active school year.
          </p>
        </div>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label
            htmlFor="cal-sub"
            className="text-xs font-bold text-[#5c554c]"
          >
            Calendar subscribe URL
          </label>
          <input
            id="cal-sub"
            type="url"
            value={subscribeUrl}
            onChange={(event) => setSubscribeUrl(event.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/…"
            disabled={isSavingFeed || !activeSchoolYearId}
            className={fieldControlClassName}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondaryClassName}
            disabled={isSavingFeed || !activeSchoolYearId}
            onClick={handleSaveFeed}
          >
            {isSavingFeed ? "Saving…" : "Save feed"}
          </button>
        </div>
        {!activeSchoolYearId ? (
          <p className="mt-3 mb-0 text-sm text-amber-800">
            Finish school year setup before linking a subscribe feed.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Type re-export helper for callers that already hold school-year settings. */
export type SettingsEaseCalendarSchoolYear = Pick<
  NonNullable<SchoolYearSettingsData["activeSchoolYear"]>,
  "id" | "calendarSubscribeUrl"
>;
