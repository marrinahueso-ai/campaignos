export interface OrganizationLocation {
  /** Display label, e.g. "Brentwood, TN" */
  label: string;
  city: string;
  state: string;
  /** Query string for a future geocoding / weather API */
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
