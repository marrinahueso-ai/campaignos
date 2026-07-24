export interface OrganizationLocation {
  /** Display label, e.g. "Brentwood, TN" or "37027" */
  label: string;
  city: string;
  state: string;
  /** US ZIP when set — preferred OpenWeather lookup */
  zip: string | null;
  /** Fallback city/state query string when zip is unset */
  query: string;
}

export type WeatherSource = "api" | "mock" | "unavailable";

export interface WeatherSnapshot {
  temperatureF: number;
  condition: string;
  source: WeatherSource;
}

export interface TodayWeatherContext {
  location: OrganizationLocation | null;
  weather: WeatherSnapshot | null;
  /** Preformatted line for display */
  displayLine: string;
}

export interface OutdoorEventsContext {
  hasOutdoorEventsThisWeek: boolean;
  helperLine: string | null;
}
