import type { OrganizationLocation, WeatherSnapshot } from "@/lib/weather/types";

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
  const condition =
    MOCK_CONDITIONS[simpleHash(location.city) % MOCK_CONDITIONS.length]!;

  return {
    temperatureF: baseTemp + variation - 3,
    condition,
    source: "mock",
  };
}

function simpleHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash;
}
