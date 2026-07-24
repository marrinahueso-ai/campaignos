import Link from "next/link";
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
  const helperLine = resolved
    ? weatherHelperLine(resolved.weather)
    : "Add your school city in Settings for live local weather.";
  const isLive = resolved?.weather.source === "api";

  return (
    <section className="cos-card space-y-5">
      <div className="space-y-1.5">
        {resolved ? (
          <>
            <p className="text-sm text-cos-text">
              <span aria-hidden>{weatherEmoji(resolved.weather.condition)}</span>{" "}
              <span className="font-display text-2xl">
                {Math.round(resolved.weather.temperatureF)}°
              </span>
            </p>
            <p className="text-xs text-cos-muted">
              {resolved.location.label}
              {isLive ? "" : " · typical for season"}
            </p>
            <p className="text-xs leading-relaxed text-cos-muted">{helperLine}</p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-cos-text">Weather</p>
            <p className="text-xs leading-relaxed text-cos-muted">{helperLine}</p>
            <Link
              href="/settings/organization"
              className="text-xs font-medium text-cos-accent hover:text-cos-text"
            >
              Set weather city →
            </Link>
          </>
        )}
      </div>

      <hr className="cos-divider" />

      <SnapshotMiniCalendar today={today} entries={monthEvents} />

      <hr className="cos-divider" />

      <div className="space-y-2">
        <p className="cos-section-title">This week</p>
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

function weatherHelperLine(weather: WeatherSnapshot): string {
  const condition = weather.condition.toLowerCase();
  const looksGood =
    /sunny|clear|partly|fair|warm|light breeze/.test(condition) &&
    !/rain|storm|thunder|snow|ice|wind|cold|freezing|fog|overcast|drizzle/.test(
      condition,
    );

  if (looksGood) return "Looks like a great day to be outside.";
  if (/rain|drizzle|storm|snow/.test(condition)) {
    return "Keep an umbrella handy today.";
  }
  return "Hope your day goes smoothly.";
}

function weatherEmoji(condition: string): string {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("drizzle")) return "🌧️";
  if (lower.includes("snow")) return "❄️";
  if (lower.includes("storm") || lower.includes("thunder")) return "⛈️";
  if (lower.includes("cloud")) return "⛅";
  if (lower.includes("fog") || lower.includes("mist")) return "🌫️";
  return "☀️";
}
