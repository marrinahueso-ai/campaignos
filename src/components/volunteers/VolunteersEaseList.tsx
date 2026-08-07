"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { eventVolunteersHref } from "@/lib/events/event-responsibility";
import {
  getVolunteerFillRateBand,
  getVolunteerFillRateLabel,
  type VolunteerFillRateBand,
  type VolunteersMasterEventRow,
} from "@/lib/event-volunteers/org-master-shared";
import { AppImage } from "@/components/images/AppImage";
import { formatLocalDate, getEventCountdown } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const BAND_CHIP: Record<
  VolunteerFillRateBand,
  { label: string; className: string }
> = {
  critical: {
    label: "Critical",
    className: "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]",
  },
  needs_attention: {
    label: "Needs attention",
    className: "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]",
  },
  fair_progress: {
    label: "Fair progress",
    className: "bg-[rgba(176,122,40,0.14)] text-[#b07a28]",
  },
  healthy: {
    label: "Healthy",
    className: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
  },
  fully_staffed: {
    label: "Covered",
    className: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
  },
};

const BAND_PCT: Record<VolunteerFillRateBand, string> = {
  critical: "text-[#a65a3a]",
  needs_attention: "text-[#a65a3a]",
  fair_progress: "text-[#b07a28]",
  healthy: "text-[#2f4a3c]",
  fully_staffed: "text-[#2f4a3c]",
};

const BAND_BAR: Record<VolunteerFillRateBand, string> = {
  critical: "bg-[#a65a3a]",
  needs_attention: "bg-[#a65a3a]",
  fair_progress: "bg-[#b07a28]",
  healthy: "bg-[#6b8171]",
  fully_staffed: "bg-[#6b8171]",
};

function formatEventDateLabel(date: string): string {
  return formatLocalDate(date, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ArtTile({
  event,
  className,
  width,
  priority,
}: {
  event: VolunteersMasterEventRow;
  className?: string;
  width: number;
  priority?: boolean;
}) {
  const source = event.artworkUrl?.trim() || "";
  const isCompact = width <= 200;
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-cos-bg",
        className,
      )}
    >
      {source ? (
        <AppImage
          src={source}
          alt=""
          fill
          preset={isCompact ? "thumb" : "card"}
          displayWidth={width}
          displayHeight={width}
          resize={isCompact ? "cover" : "contain"}
          className={
            isCompact
              ? "object-cover object-center"
              : "object-contain object-center p-1"
          }
          style={{ objectFit: isCompact ? "cover" : "contain" }}
          sizes={isCompact ? "56px" : "(max-width: 820px) 100vw, 280px"}
          priority={priority}
        />
      ) : null}
    </div>
  );
}

function topNeedLabel(event: VolunteersMasterEventRow): string {
  const top = event.underfilledRoles[0];
  if (top) {
    return `Top need: ${top.name}`;
  }
  if (event.isCovered) {
    return "All roles filled";
  }
  if (!event.hasSnapshot) {
    return "Connect SignUpGenius on the event to see fill";
  }
  return "No open roles listed";
}

export function VolunteersFocusCard({
  event,
  onNext,
  hasNext,
}: {
  event: VolunteersMasterEventRow;
  onNext?: () => void;
  hasNext?: boolean;
}) {
  const band = getVolunteerFillRateBand(event.fillRatePercent);
  const chip = band
    ? BAND_CHIP[band]
    : {
        label: event.needsPeople ? "Needs people" : "In view",
        className: "bg-cos-bg-alt text-cos-muted",
      };
  const countdown = getEventCountdown(event.date);
  const fillPercent = event.fillRatePercent;
  const fillLabel =
    fillPercent === null ? "—" : `${fillPercent}% filled`;
  const fillWidth =
    fillPercent === null ? 0 : Math.max(0, Math.min(100, fillPercent));
  const openRoleCount = event.underfilledRoleCount;
  const story =
    openRoleCount > 0
      ? `${openRoleCount} role${openRoleCount === 1 ? "" : "s"} still open. Share the signup before the week fills up.`
      : event.isCovered
        ? "All roles are covered for this event."
        : "Open Event volunteers to connect a signup or review roles.";

  return (
    <article
      key={event.id}
      className="grid gap-3 rounded-[22px] border border-cos-border bg-cos-card p-3 shadow-[0_8px_28px_rgba(28,36,48,0.06)] md:grid-cols-[minmax(220px,280px)_1fr] md:gap-4 md:p-3.5"
    >
      <ArtTile
        event={event}
        className="min-h-[240px] w-full self-stretch overflow-hidden rounded-[14px]"
        width={800}
        priority
      />
      <div className="flex flex-col gap-3 p-3 sm:p-5 md:py-4 md:pr-5 md:pl-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-cos-muted">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
              chip.className,
            )}
          >
            {chip.label}
          </span>
          <span>{fillLabel}</span>
          {!countdown.isPast ? (
            <>
              <span aria-hidden>·</span>
              <span>{countdown.label}</span>
            </>
          ) : null}
        </div>
        <div
          className="max-w-xs"
          title={getVolunteerFillRateLabel(fillPercent) ?? undefined}
          aria-label={
            fillPercent === null
              ? "Fill rate unavailable"
              : `Fill rate ${fillPercent}%`
          }
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(42,38,34,0.08)]">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                band ? BAND_BAR[band] : "bg-cos-border",
              )}
              style={{ width: `${fillWidth}%` }}
            />
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl tracking-[-0.02em] text-cos-text sm:text-[28px]">
            {event.title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-cos-muted">
            {formatEventDateLabel(event.date)}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-cos-muted">{story}</p>
        {event.underfilledRoles.length > 0 ? (
          <ul className="mt-0.5">
            {event.underfilledRoles.map((role) => (
              <li
                key={`${event.id}:${role.name.toLowerCase()}`}
                className="grid grid-cols-[1fr_auto] gap-2.5 border-t border-cos-border py-2 text-[13px] first:border-t-0 first:pt-0"
              >
                <span className="truncate font-semibold text-cos-text">
                  {role.name}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-[#a65a3a]">
                  {role.openSpots} open
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-2.5">
          {event.signupUrl ? (
            <a
              href={event.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714]"
            >
              Open signup
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          <Link
            href={eventVolunteersHref(event.id)}
            className={cn(
              "inline-flex items-center rounded-full px-[18px] py-[11px] text-[13px] font-bold transition hover:-translate-y-px",
              event.signupUrl
                ? "border-[1.5px] border-cos-border bg-cos-card text-cos-text"
                : "bg-cos-text text-cos-card hover:bg-[#1a1714]",
            )}
          >
            Event volunteers
          </Link>
          {hasNext && onNext ? (
            <button
              type="button"
              onClick={onNext}
              className="rounded-full px-2.5 py-[11px] text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
            >
              Next event →
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function VolunteersQueueRow({
  event,
}: {
  event: VolunteersMasterEventRow;
}) {
  const band = getVolunteerFillRateBand(event.fillRatePercent);
  const fillLabel =
    event.fillRatePercent === null ? "—" : `${event.fillRatePercent}%`;
  const fillWidth =
    event.fillRatePercent === null
      ? 0
      : Math.max(0, Math.min(100, event.fillRatePercent));
  const statusLabel = getVolunteerFillRateLabel(event.fillRatePercent);
  const covered = event.isCovered;

  return (
    <Link
      href={eventVolunteersHref(event.id)}
      className="grid w-full grid-cols-[56px_1fr] items-center gap-3.5 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.55)] px-3.5 py-3 text-left transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:grid-cols-[56px_minmax(0,1.4fr)_minmax(100px,140px)_minmax(5rem,0.9fr)]"
    >
      <ArtTile
        event={event}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px]"
        width={128}
      />
      <span className="min-w-0">
        <p className="truncate text-sm font-bold text-cos-text">{event.title}</p>
        <p className="mt-0.5 truncate text-xs text-cos-muted">
          {formatLocalDate(event.date, { month: "short", day: "numeric" })}
          {" · "}
          {topNeedLabel(event)}
        </p>
      </span>
      <span
        className="hidden min-w-0 sm:block"
        title={statusLabel ?? undefined}
        aria-label={
          event.fillRatePercent === null
            ? "Fill rate unavailable"
            : `Fill rate ${fillLabel}${statusLabel ? `, ${statusLabel}` : ""}`
        }
      >
        <p
          className={cn(
            "mb-1 flex items-center gap-1 text-[13px] font-bold tabular-nums",
            band ? BAND_PCT[band] : "text-cos-muted",
          )}
        >
          {fillLabel}
          {band === "fully_staffed" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : null}
        </p>
        <span className="block h-1 overflow-hidden rounded-full bg-[rgba(42,38,34,0.08)]">
          <span
            className={cn(
              "block h-full rounded-full",
              band ? BAND_BAR[band] : "bg-cos-border",
            )}
            style={{ width: `${fillWidth}%` }}
          />
        </span>
      </span>
      <span
        className={cn(
          "hidden text-right text-xs font-bold whitespace-nowrap sm:block",
          covered ? "text-[#2f4a3c]" : "text-cos-muted",
        )}
      >
        {covered ? (
          <>
            Covered
            <span className="mt-0.5 block font-semibold text-cos-muted">
              0 open
            </span>
          </>
        ) : typeof event.openSpots === "number" && event.openSpots > 0 ? (
          <>
            {event.openSpots} open
            <span className="mt-0.5 block font-semibold text-cos-muted">
              {event.underfilledRoleCount} role
              {event.underfilledRoleCount === 1 ? "" : "s"}
            </span>
          </>
        ) : event.underfilledRoleCount > 0 ? (
          <>
            Needs people
            <span className="mt-0.5 block font-semibold text-cos-muted">
              {event.underfilledRoleCount} role
              {event.underfilledRoleCount === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <>
            —
            <span className="mt-0.5 block font-semibold text-cos-muted">
              No fill data yet
            </span>
          </>
        )}
      </span>
    </Link>
  );
}

export function VolunteersEmptyEase({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="px-6 py-10 text-center text-sm leading-relaxed text-cos-muted">
      <strong className="mb-2 block font-display text-[22px] font-semibold text-cos-text">
        {title}
      </strong>
      {body}
    </div>
  );
}
