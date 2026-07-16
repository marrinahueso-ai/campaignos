"use client";

import { useEffect, useMemo, useState } from "react";
import {
  combineLocalDateAndTimeToIso,
  parseLocalDate,
} from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface EventDetailHeroCountdownProps {
  eventDate: string;
  eventTime: string | null;
  className?: string;
}

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

function getEventTargetMs(eventDate: string, eventTime: string | null): number | null {
  if (eventTime?.trim()) {
    const iso = combineLocalDateAndTimeToIso(eventDate, eventTime.trim());
    if (!iso) {
      return null;
    }
    return new Date(iso).getTime();
  }

  const local = parseLocalDate(eventDate);
  if (Number.isNaN(local.getTime())) {
    return null;
  }
  return local.getTime();
}

function computeCountdown(targetMs: number, nowMs: number): CountdownParts {
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isPast: false };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function EventDetailHeroCountdown({
  eventDate,
  eventTime,
  className,
}: EventDetailHeroCountdownProps) {
  const targetMs = useMemo(
    () => getEventTargetMs(eventDate, eventTime),
    [eventDate, eventTime],
  );
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts =
    targetMs == null || nowMs == null
      ? null
      : computeCountdown(targetMs, nowMs);

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-cos-muted uppercase">
        Countdown to event
      </p>

      {parts == null ? (
        <div className="mt-3 h-14 animate-pulse rounded-lg bg-cos-bg" aria-hidden />
      ) : parts.isPast ? (
        <p className="mt-3 font-display text-2xl text-cos-text">Event completed</p>
      ) : (
        <div className="mt-3 flex min-w-0 items-end gap-1.5 sm:gap-2">
          <CountdownUnit value={String(parts.days)} label="Days" />
          <span className="pb-5 font-display text-2xl text-cos-muted">:</span>
          <CountdownUnit value={pad(parts.hours)} label="Hrs" />
          <span className="pb-5 font-display text-2xl text-cos-muted">:</span>
          <CountdownUnit value={pad(parts.minutes)} label="Mins" />
          <span className="pb-5 font-display text-2xl text-cos-muted">:</span>
          <CountdownUnit value={pad(parts.seconds)} label="Secs" />
        </div>
      )}
    </div>
  );
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[2.25rem] text-center sm:min-w-[2.75rem]">
      <p className="font-display text-2xl leading-none text-cos-text tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-medium tracking-wide text-cos-muted uppercase">
        {label}
      </p>
    </div>
  );
}
