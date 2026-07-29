import Link from "next/link";
import { CloudSun } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { WeatherConditionIcon } from "@/components/today/widgets/WeatherConditionIcon";
import { getMockWeatherSnapshot } from "@/lib/weather/mock";
import { cn } from "@/lib/utils/cn";
import type {
  OrganizationLocation,
  TodayWeatherContext,
  WeatherHourlyPoint,
  WeatherSnapshot,
} from "@/lib/weather/types";

interface WeatherWidgetProps {
  weather: TodayWeatherContext;
  /** Full pin for the overview top-right corner. */
  compact?: boolean;
  /** Fun tip tying weather to events today / tomorrow. */
  insight?: string | null;
}

export function WeatherWidget({
  weather,
  compact = false,
  insight = null,
}: WeatherWidgetProps) {
  const resolved = resolveSnapshotWeather(weather);
  const isLive = resolved?.weather.source === "api";

  if (compact) {
    return (
      <section
        className={cn(
          "flex flex-col justify-between gap-4 rounded-2xl bg-cos-bg-alt px-5 py-5 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]",
        )}
      >
        {resolved ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <WeatherConditionIcon
                  condition={resolved.weather.condition}
                  className="h-5 w-5"
                />
                <h3 className="text-sm font-semibold text-cos-text">Weather</h3>
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <WeatherConditionIcon
                    condition={resolved.weather.condition}
                    className="h-10 w-10"
                  />
                  <span className="font-display text-5xl leading-none text-cos-text">
                    {Math.round(resolved.weather.temperatureF)}°
                  </span>
                  <span className="truncate text-sm text-cos-muted">
                    {resolved.weather.condition}
                  </span>
                </p>
                <p className="mt-2 truncate text-xs text-cos-muted">
                  {resolved.location.label}
                  {isLive ? "" : " · typical for season"}
                </p>
              </div>
              {insight ? (
                <p className="text-sm leading-snug text-cos-text/90">{insight}</p>
              ) : null}
            </div>
            <HourlyStrip hours={resolved.weather.hourly} />
          </>
        ) : (
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <WeatherConditionIcon condition="Partly cloudy" className="h-5 w-5" />
                <h3 className="text-sm font-semibold text-cos-text">Weather</h3>
              </div>
              <p className="text-sm text-cos-muted">
                Set your weather city in Settings for a local forecast.
              </p>
            </div>
            <Link
              href="/settings/organization"
              className="text-xs font-medium text-cos-brand-sage hover:text-cos-brand-navy"
            >
              Settings →
            </Link>
          </div>
        )}
      </section>
    );
  }

  return (
    <DashboardWidgetCard icon={CloudSun} title="Weather" showMenu={false}>
      {resolved ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <WeatherConditionIcon
              condition={resolved.weather.condition}
              className="mt-0.5 h-10 w-10"
            />
            <div>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-3xl leading-none text-cos-text">
                  {Math.round(resolved.weather.temperatureF)}°
                </span>
                <span className="text-sm text-cos-muted">
                  {resolved.weather.condition}
                </span>
              </p>
              <p className="mt-1 text-xs text-cos-muted">
                {resolved.location.label}
                {isLive ? "" : " · typical for season"}
              </p>
            </div>
          </div>
          {insight ? (
            <p className="text-sm leading-snug text-cos-text/90">{insight}</p>
          ) : null}
          <HourlyStrip hours={resolved.weather.hourly} />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-cos-muted">
            Add your weather city in Settings for live local weather.
          </p>
          <Link
            href="/settings/organization"
            className="text-xs font-medium text-cos-brand-sage hover:text-cos-brand-navy"
          >
            Set weather city →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function HourlyStrip({ hours }: { hours: WeatherHourlyPoint[] }) {
  if (hours.length === 0) return null;

  return (
    <div className="border-t border-cos-border/60 pt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-cos-muted">
        Next hours
      </p>
      <ul className="grid grid-cols-4 gap-1">
        {hours.slice(0, 4).map((hour) => (
          <li
            key={hour.hourLabel}
            className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center"
          >
            <span className="text-[11px] text-cos-muted">{hour.hourLabel}</span>
            <WeatherConditionIcon
              condition={hour.condition}
              className="h-7 w-7"
              title={hour.condition}
            />
            <span className="font-display text-lg leading-none text-cos-text">
              {Math.round(hour.temperatureF)}°
            </span>
            <span className="truncate text-[10px] leading-tight text-cos-muted">
              {shortCondition(hour.condition)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortCondition(condition: string): string {
  if (condition === "Partly cloudy") return "Clouds";
  if (condition === "Light breeze") return "Breeze";
  return condition;
}

function resolveSnapshotWeather(weather: TodayWeatherContext): {
  location: OrganizationLocation;
  weather: WeatherSnapshot;
} | null {
  if (weather.location && weather.weather) {
    const snapshot = weather.weather;
    if (snapshot.hourly?.length) {
      return { location: weather.location, weather: snapshot };
    }
    return {
      location: weather.location,
      weather: {
        ...snapshot,
        hourly: getMockWeatherSnapshot(weather.location).hourly,
      },
    };
  }
  if (weather.location) {
    return {
      location: weather.location,
      weather: getMockWeatherSnapshot(weather.location),
    };
  }
  return null;
}
