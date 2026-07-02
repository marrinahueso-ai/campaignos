import type { OrganizationLocation, WeatherSnapshot } from "@/lib/weather/types";

interface OpenWeatherResponse {
  main?: { temp?: number };
  weather?: { main?: string; description?: string }[];
}

/**
 * Optional live weather via OpenWeatherMap (server-side only).
 * Set WEATHER_API_KEY in environment — never exposed to the browser.
 */
export async function fetchWeatherFromApi(
  location: OrganizationLocation,
  apiKey: string,
): Promise<WeatherSnapshot | null> {
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", location.query);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "imperial");

  const response = await fetch(url.toString(), {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OpenWeatherResponse;
  const temp = data.main?.temp;
  const condition =
    data.weather?.[0]?.main ?? data.weather?.[0]?.description ?? null;

  if (temp === undefined || !condition) {
    return null;
  }

  return {
    temperatureF: temp,
    condition: humanizeCondition(condition),
    source: "api",
  };
}

function humanizeCondition(raw: string): string {
  const normalized = raw.toLowerCase();
  if (normalized === "clear") return "Clear";
  if (normalized.includes("cloud")) return "Partly cloudy";
  if (normalized.includes("rain")) return "Rainy";
  if (normalized.includes("snow")) return "Snowy";
  if (normalized.includes("thunder")) return "Storms";
  if (normalized.includes("mist") || normalized.includes("fog")) {
    return "Foggy";
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
