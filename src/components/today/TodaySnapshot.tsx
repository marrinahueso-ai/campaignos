import Link from "next/link";
import { CloudSun } from "lucide-react";
import { getMockWeatherSnapshot } from "@/lib/weather/mock";
import { SnapshotMiniCalendar } from "@/components/today/SnapshotMiniCalendar";
import { WeekAheadStrip } from "@/components/today/WeekAheadStrip";
import type { TodayWeekEntry } from "@/types/today";
import type {
  OrganizationLocation,
  TodayWeatherContext,
  WeatherSnapshot,
} from "@/lib/weather/types";

interface TodaySnapshotProps {
  today: string;
  weather: TodayWeatherContext;
  weekEntries: TodayWeekEntry[];
  /** School events for the calendar month (events only). */
  monthEvents: TodayWeekEntry[];
}

export function TodaySnapshot({
  today,
  weather,
  weekEntries,
  monthEvents,
}: TodaySnapshotProps) {
  const resolved = resolveSnapshotWeather(weather);
  const isLive = resolved?.weather.source === "api";

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        {resolved ? (
          <>
            <div className="flex items-start gap-3">
              <CloudSun
                className="mt-1 h-7 w-7 shrink-0 text-cos-brand-sage"
                aria-hidden
              />
              <div>
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-display text-3xl leading-none text-cos-brand-navy">
                    {Math.round(resolved.weather.temperatureF)}°
                  </span>
                  <span className="text-sm text-cos-text/85">
                    {resolved.weather.condition}
                  </span>
                </p>
                <p className="mt-1 text-xs text-cos-muted">
                  {resolved.location.label}
                  {isLive ? "" : " · typical for season"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-cos-brand-navy">Weather</p>
            <p className="text-xs leading-relaxed text-cos-muted">
              Add your school city in Settings for live local weather.
            </p>
            <Link
              href="/settings/organization"
              className="text-xs font-medium text-cos-brand-sage hover:text-cos-brand-navy"
            >
              Set weather city →
            </Link>
          </>
        )}
      </div>

      <SnapshotMiniCalendar today={today} entries={monthEvents} />

      <div className="space-y-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-cos-muted uppercase">
          This week
        </p>
        <WeekAheadStrip entries={weekEntries} today={today} />
      </div>
    </section>
  );
}

function resolveSnapshotWeather(context: TodayWeatherContext): {
  location: OrganizationLocation;
  weather: WeatherSnapshot;
} | null {
  if (context.location && context.weather) {
    return { location: context.location, weather: context.weather };
  }

  if (context.location) {
    return {
      location: context.location,
      weather: getMockWeatherSnapshot(context.location),
    };
  }

  return null;
}
