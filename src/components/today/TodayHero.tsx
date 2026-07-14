import { getTimeOfDayGreeting } from "@/lib/weather/greeting";

interface TodayHeroProps {
  firstName: string | null;
  attentionCount: number;
  teammateNote?: string;
  /** IANA timezone for server-rendered greetings; omit to use browser local time. */
  timezone?: string;
}

export function TodayHero({
  firstName,
  attentionCount,
  teammateNote,
  timezone,
}: TodayHeroProps) {
  const greeting = getTimeOfDayGreeting(new Date(), timezone);
  const greetingLine = `${greeting}, ${firstName?.trim() || "there"}`;

  return (
    <header className="space-y-4 border-b border-cos-border pb-8">
      <p className="studio-eyebrow">Today</p>
      <h1 className="font-display text-4xl leading-tight text-cos-text sm:text-5xl">
        {greetingLine}
      </h1>
      {attentionCount > 0 ? (
        <p className="max-w-xl text-base leading-relaxed text-cos-muted">
          {attentionCount === 1
            ? "You're in great shape — one thing could use your touch today."
            : `You're in great shape — ${attentionCount} things could use your touch today.`}
        </p>
      ) : (
        <div className="max-w-xl space-y-1 text-base leading-relaxed text-cos-muted">
          <p>{teammateNote ?? "You're all caught up for now."}</p>
          <p className="text-sm text-cos-muted">We&apos;ll nudge you when something needs you.</p>
        </div>
      )}
    </header>
  );
}
