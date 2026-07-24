import Link from "next/link";
import { CloudSun } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { getMockWeatherSnapshot } from "@/lib/weather/mock";
import { cn } from "@/lib/utils/cn";
import type {
  OrganizationLocation,
  TodayWeatherContext,
  WeatherSnapshot,
} from "@/lib/weather/types";

interface WeatherWidgetProps {
  weather: TodayWeatherContext;
  /** Compact pin for the overview top-right corner. */
  compact?: boolean;
}

export function WeatherWidget({
  weather,
  compact = false,
}: WeatherWidgetProps) {
  const resolved = resolveSnapshotWeather(weather);
  const isLive = resolved?.weather.source === "api";

  if (compact) {
    return (
      <section
        className={cn(
          "rounded-2xl bg-cos-bg-alt px-4 py-3 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]",
        )}
      >
        {resolved ? (
          <div className="flex items-center gap-3">
            <CloudSun
              className="h-7 w-7 shrink-0 text-cos-brand-sage"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-2xl leading-none text-cos-text">
                  {Math.round(resolved.weather.temperatureF)}°
                </span>
                <span className="truncate text-sm text-cos-muted">
                  {resolved.weather.condition}
                </span>
              </p>
              <p className="mt-0.5 truncate text-xs text-cos-muted">
                {resolved.location.label}
                {isLive ? "" : " · typical for season"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-cos-muted">Set your school city for weather.</p>
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
        <div className="flex items-start gap-3">
          <CloudSun
            className="mt-0.5 h-8 w-8 shrink-0 text-cos-brand-sage"
            aria-hidden
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
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-cos-muted">
            Add your school city in Settings for live local weather.
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

function resolveSnapshotWeather(weather: TodayWeatherContext): {
  location: OrganizationLocation;
  weather: WeatherSnapshot;
} | null {
  if (weather.location && weather.weather) {
    return { location: weather.location, weather: weather.weather };
  }
  if (weather.location) {
    return {
      location: weather.location,
      weather: getMockWeatherSnapshot(weather.location),
    };
  }
  return null;
}
