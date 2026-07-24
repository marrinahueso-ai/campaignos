import { buildMockHourly, formatHourLabel } from "@/lib/weather/mock";
import type {
  OrganizationLocation,
  WeatherHourlyPoint,
  WeatherSnapshot,
} from "@/lib/weather/types";

interface OpenWeatherResponse {
  name?: string;
  coord?: { lat?: number; lon?: number };
  main?: { temp?: number };
  weather?: { main?: string; description?: string }[];
}

interface OpenWeatherForecastResponse {
  list?: {
    dt: number;
    main?: { temp?: number };
    weather?: { main?: string; description?: string }[];
  }[];
}

interface OpenMeteoHourlyResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    weather_code?: (number | null)[];
  };
}

/**
 * Optional live weather via OpenWeatherMap (server-side only).
 * Prefers ZIP lookup when set — more accurate than city name.
 * Hourly strip uses Open-Meteo when coords are available, else OWM 3h forecast.
 * Set WEATHER_API_KEY in environment — never exposed to the browser.
 */
export async function fetchWeatherFromApi(
  location: OrganizationLocation,
  apiKey: string,
): Promise<WeatherSnapshot | null> {
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  if (location.zip) {
    url.searchParams.set("zip", `${location.zip},US`);
  } else {
    url.searchParams.set("q", location.query);
  }
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

  const humanCondition = humanizeCondition(condition);
  const lat = data.coord?.lat;
  const lon = data.coord?.lon;

  let hourly =
    lat !== undefined && lon !== undefined
      ? await fetchHourlyFromOpenMeteo(lat, lon)
      : [];

  if (hourly.length < 4) {
    const fromForecast = await fetchHourlyFromOpenWeatherForecast(
      location,
      apiKey,
    );
    if (fromForecast.length > hourly.length) {
      hourly = fromForecast;
    }
  }

  if (hourly.length < 4) {
    hourly = buildMockHourly(temp, humanCondition, location.label);
  }

  return {
    temperatureF: temp,
    condition: humanCondition,
    source: "api",
    hourly: hourly.slice(0, 4),
  };
}

async function fetchHourlyFromOpenMeteo(
  lat: number,
  lon: number,
): Promise<WeatherHourlyPoint[]> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("hourly", "temperature_2m,weather_code");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("forecast_hours", "6");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString(), {
      next: { revalidate: 1800 },
    });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OpenMeteoHourlyResponse;
    const times = data.hourly?.time ?? [];
    const temps = data.hourly?.temperature_2m ?? [];
    const codes = data.hourly?.weather_code ?? [];
    const now = Date.now();
    const points: WeatherHourlyPoint[] = [];

    for (let i = 0; i < times.length && points.length < 4; i += 1) {
      const time = times[i];
      if (!time) continue;
      const at = new Date(time);
      if (at.getTime() <= now) continue;
      const temperature = temps[i];
      if (temperature == null) continue;
      points.push({
        hourLabel: formatHourLabel(at),
        temperatureF: Math.round(temperature),
        condition: conditionFromWmoCode(codes[i] ?? null),
      });
    }

    return points;
  } catch {
    return [];
  }
}

async function fetchHourlyFromOpenWeatherForecast(
  location: OrganizationLocation,
  apiKey: string,
): Promise<WeatherHourlyPoint[]> {
  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
    if (location.zip) {
      url.searchParams.set("zip", `${location.zip},US`);
    } else {
      url.searchParams.set("q", location.query);
    }
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "imperial");
    url.searchParams.set("cnt", "8");

    const response = await fetch(url.toString(), {
      next: { revalidate: 1800 },
    });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OpenWeatherForecastResponse;
    const nowSec = Math.floor(Date.now() / 1000);
    const points: WeatherHourlyPoint[] = [];

    for (const entry of data.list ?? []) {
      if (points.length >= 4) break;
      if (entry.dt <= nowSec) continue;
      const temperature = entry.main?.temp;
      const raw =
        entry.weather?.[0]?.main ?? entry.weather?.[0]?.description ?? null;
      if (temperature === undefined || !raw) continue;
      points.push({
        hourLabel: formatHourLabel(new Date(entry.dt * 1000)),
        temperatureF: Math.round(temperature),
        condition: humanizeCondition(raw),
      });
    }

    return points;
  } catch {
    return [];
  }
}

function conditionFromWmoCode(code: number | null): string {
  if (code == null) return "Clear";
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rainy";
  if (code <= 86) return "Snowy";
  if (code <= 99) return "Storms";
  return "Clear";
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
