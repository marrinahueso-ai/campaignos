import { getMockWeatherSnapshot } from "@/lib/weather/mock";
import { SnapshotMiniCalendar } from "@/components/today/SnapshotMiniCalendar";
import { WeekAheadStrip } from "@/components/today/WeekAheadStrip";
import type {
  TodayWaitingOnOthersItem,
  TodayWeekEntry,
} from "@/types/today";
import type {
  OrganizationLocation,
  TodayWeatherContext,
  WeatherSnapshot,
} from "@/lib/weather/types";

interface TodaySnapshotProps {
  today: string;
  weather: TodayWeatherContext;
  weekEntries: TodayWeekEntry[];
  waitingOnOthers: TodayWaitingOnOthersItem[];
}

const FALLBACK_LOCATION: OrganizationLocation = {
  label: "Your community",
  city: "Local",
  state: "",
  query: "US",
};

export function TodaySnapshot({
  today,
  weather,
  weekEntries,
  waitingOnOthers,
}: TodaySnapshotProps) {
  const resolved = resolveSnapshotWeather(weather);
  const helperLine = weatherHelperLine(resolved.weather);

  return (
    <section className="cos-card space-y-5">
      <div className="space-y-1.5">
        <p className="text-sm text-cos-text">
          <span aria-hidden>{weatherEmoji(resolved.weather.condition)}</span>{" "}
          <span className="font-display text-2xl">{Math.round(resolved.weather.temperatureF)}°</span>
        </p>
        <p className="text-xs text-cos-muted">{resolved.location.label}</p>
        <p className="text-xs leading-relaxed text-cos-muted/80">{helperLine}</p>
      </div>

      <hr className="cos-divider" />

      <SnapshotMiniCalendar
        today={today}
        entries={weekEntries}
        approvalDates={waitingOnOthers.map((item) => item.dueDate)}
      />

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
} {
  if (context.location && context.weather) {
    return { location: context.location, weather: context.weather };
  }

  if (context.location) {
    return {
      location: context.location,
      weather: getMockWeatherSnapshot(context.location),
    };
  }

  return {
    location: FALLBACK_LOCATION,
    weather: getMockWeatherSnapshot(FALLBACK_LOCATION),
  };
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
