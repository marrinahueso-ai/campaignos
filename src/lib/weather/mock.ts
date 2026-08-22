import type {
  OrganizationLocation,
  WeatherHourlyPoint,
  WeatherSnapshot,
} from "@/lib/weather/types";

const MOCK_CONDITIONS = [
  "Sunny",
  "Partly cloudy",
  "Clear",
  "Light breeze",
] as const;

/** Seasonal placeholder temps when no weather API is configured. */
const MONTHLY_TYPICAL_HIGH_F = [48, 52, 58, 67, 74, 82, 86, 85, 78, 67, 56, 49];

export const DEFAULT_WEATHER_TIMEZONE = "America/Chicago";

export function getMockWeatherSnapshot(
  location: OrganizationLocation,
  timeZone: string = DEFAULT_WEATHER_TIMEZONE,
): WeatherSnapshot {
  const month = new Date().getMonth();
  const baseTemp = MONTHLY_TYPICAL_HIGH_F[month] ?? 68;
  const variation = simpleHash(location.label) % 7;
  const temperatureF = baseTemp + variation - 3;
  const condition =
    MOCK_CONDITIONS[simpleHash(location.city) % MOCK_CONDITIONS.length]!;

  return {
    temperatureF,
    condition,
    source: "mock",
    hourly: buildMockHourly(temperatureF, condition, location.label, timeZone),
  };
}

export function buildMockHourly(
  temperatureF: number,
  condition: string,
  seed: string,
  timeZone: string = DEFAULT_WEATHER_TIMEZONE,
): WeatherHourlyPoint[] {
  const drift = (simpleHash(seed) % 5) - 2;
  const now = Date.now();
  const startIndex = simpleHash(`${seed}:sky`) % MOCK_CONDITIONS.length;
  return Array.from({ length: 4 }, (_, index) => {
    const at = new Date(now + (index + 1) * 60 * 60 * 1000);
    const hourCondition =
      MOCK_CONDITIONS[(startIndex + index) % MOCK_CONDITIONS.length]!;
    return {
      hourLabel: formatHourLabel(at, timeZone),
      temperatureF: Math.round(temperatureF + drift * (index + 1)),
      condition: index === 0 ? condition : hourCondition,
    };
  });
}

/** Hour label in the org timezone — never the Vercel UTC clock. */
export function formatHourLabel(
  date: Date,
  timeZone: string = DEFAULT_WEATHER_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "12";
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value ?? "AM";
  const suffix = dayPeriod.toLowerCase().startsWith("p") ? "pm" : "am";
  return `${hour}${suffix}`;
}

function simpleHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash;
}
