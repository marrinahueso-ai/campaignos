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

export interface WeatherHourlyPoint {
  /** Local hour label, e.g. "1pm" */
  hourLabel: string;
  temperatureF: number;
  condition: string;
}

export interface WeatherSnapshot {
  temperatureF: number;
  condition: string;
  source: WeatherSource;
  /** Next few hours (typically 4) for the overview pin. */
  hourly: WeatherHourlyPoint[];
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

/** School event today or tomorrow for weather tip copy. */
export interface WeatherNearbyEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  isOutdoor: boolean;
}
