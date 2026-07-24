import type { Organization } from "@/types";
import type { OrganizationLocation } from "@/lib/weather/types";

const CITY_STATE_ABBR =
  /^([^,]+),\s*([A-Za-z]{2})\s*(?:\d{5}(?:-\d{4})?)?$/;

const CITY_STATE_NAME =
  /^([^,]+),\s*([A-Za-z][A-Za-z\s.]{1,28})$/;

const US_ZIP = /^(\d{5})(?:-\d{4})?$/;

/**
 * Derives a location for weather.
 * Prefers weather ZIP, then city/state, then district parsing.
 */
export function parseOrganizationLocation(
  organization: Organization | null,
): OrganizationLocation | null {
  if (!organization) return null;

  const zip = normalizeZip(organization.weatherZip);
  const weatherCity = organization.weatherCity?.trim() || "";
  const weatherState = organization.weatherState?.trim()
    ? normalizeState(organization.weatherState.trim())
    : "";

  if (zip) {
    const label =
      weatherCity && weatherState
        ? `${weatherCity}, ${weatherState}`
        : weatherCity || zip;
    return {
      label,
      city: weatherCity || zip,
      state: weatherState,
      zip,
      query: weatherCity && weatherState
        ? `${weatherCity}, ${weatherState}, US`
        : `${zip}, US`,
    };
  }

  if (weatherCity && weatherState) {
    return {
      label: `${weatherCity}, ${weatherState}`,
      city: weatherCity,
      state: weatherState,
      zip: null,
      query: `${weatherCity}, ${weatherState}, US`,
    };
  }
  if (weatherCity) {
    return {
      label: weatherCity,
      city: weatherCity,
      state: "",
      zip: null,
      query: `${weatherCity}, US`,
    };
  }

  const district = organization.district?.trim();
  if (district) {
    const abbrMatch = district.match(CITY_STATE_ABBR);
    if (abbrMatch) {
      const city = abbrMatch[1]!.trim();
      const state = normalizeState(abbrMatch[2]!.trim());
      return {
        label: `${city}, ${state}`,
        city,
        state,
        zip: null,
        query: `${city}, ${state}, US`,
      };
    }

    const nameMatch = district.match(CITY_STATE_NAME);
    if (nameMatch) {
      const city = nameMatch[1]!.trim();
      const state = normalizeState(nameMatch[2]!.trim());
      if (state.length >= 2 && state.length <= 20) {
        return {
          label: `${city}, ${state}`,
          city,
          state,
          zip: null,
          query: `${city}, ${state}, US`,
        };
      }
    }

    const cleaned = cleanDistrictForWeather(district);
    if (cleaned) {
      return {
        label: cleaned,
        city: cleaned,
        state: "",
        zip: null,
        query: `${cleaned}, US`,
      };
    }
  }

  return null;
}

export function normalizeZip(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const match = trimmed.match(US_ZIP);
  return match ? match[1]! : null;
}

function cleanDistrictForWeather(district: string): string | null {
  const cleaned = district
    .replace(/\b(public\s+)?schools?\b/gi, "")
    .replace(/\bschool\s+district\b/gi, "")
    .replace(/\bdistrict\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,\s]+$/g, "");

  return cleaned.length >= 2 ? cleaned : null;
}

function normalizeState(value: string): string {
  if (value.length === 2) {
    return value.toUpperCase();
  }
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatWeatherLine(
  location: OrganizationLocation | null,
  weather: { temperatureF: number; condition: string } | null,
): string {
  if (!location || !weather) {
    return "Local weather unavailable";
  }

  return `${location.label} · ${Math.round(weather.temperatureF)}° · ${weather.condition}`;
}
