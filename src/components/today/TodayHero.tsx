import { getTimeOfDayGreeting } from "@/lib/weather/greeting";

interface TodayHeroProps {
  firstName: string | null;
  /** Unused — calm status line matches lean home mock. */
  attentionCount?: number;
  teammateNote?: string;
  /** IANA timezone for server-rendered greetings; omit to use browser local time. */
  timezone?: string;
}

export function TodayHero({
  firstName,
  teammateNote,
  timezone,
}: TodayHeroProps) {
  const greeting = getTimeOfDayGreeting(new Date(), timezone);
  const greetingLine = `${greeting}, ${firstName?.trim() || "there"}`;
  const statusLine =
    teammateNote?.trim() ||
    "You're clear for tonight — next focus is below.";

  return (
    <header className="space-y-2">
      <h1 className="font-display text-4xl leading-tight text-cos-brand-navy sm:text-5xl">
        {greetingLine}
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-cos-muted">
        {statusLine}
      </p>
    </header>
  );
}
