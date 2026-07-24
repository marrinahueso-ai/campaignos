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

export function getMockWeatherSnapshot(
  location: OrganizationLocation,
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
    hourly: buildMockHourly(temperatureF, condition, location.label),
  };
}

export function buildMockHourly(
  temperatureF: number,
  condition: string,
  seed: string,
): WeatherHourlyPoint[] {
  const drift = (simpleHash(seed) % 5) - 2;
  const now = new Date();
  return Array.from({ length: 4 }, (_, index) => {
    const at = new Date(now.getTime() + (index + 1) * 60 * 60 * 1000);
    return {
      hourLabel: formatHourLabel(at),
      temperatureF: Math.round(temperatureF + drift * ((index + 1) / 4)),
      condition,
    };
  });
}

export function formatHourLabel(date: Date): string {
  const hours = date.getHours();
  const hour12 = hours % 12 || 12;
  const suffix = hours < 12 ? "am" : "pm";
  return `${hour12}${suffix}`;
}

function simpleHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash;
}
