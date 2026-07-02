import type { Organization } from "@/types";
import { fetchWeatherFromApi } from "@/lib/weather/provider";
import { getMockWeatherSnapshot } from "@/lib/weather/mock";
import {
  formatWeatherLine,
  parseOrganizationLocation,
} from "@/lib/weather/location";
import type { TodayWeatherContext } from "@/lib/weather/types";

const UNAVAILABLE: TodayWeatherContext = {
  location: null,
  weather: null,
  displayLine: "Local weather unavailable",
};

/**
 * Server-only weather context for the Today page.
 * Never throws — always returns a safe display line.
 */
export async function getTodayWeatherContext(
  organization: Organization | null,
): Promise<TodayWeatherContext> {
  try {
    const location = parseOrganizationLocation(organization);
    if (!location) {
      return UNAVAILABLE;
    }

    const apiKey = process.env.WEATHER_API_KEY?.trim();
    if (apiKey) {
      const live = await fetchWeatherFromApi(location, apiKey);
      if (live) {
        return {
          location,
          weather: live,
          displayLine: formatWeatherLine(location, live),
        };
      }
    }

    const mock = getMockWeatherSnapshot(location);
    return {
      location,
      weather: mock,
      displayLine: formatWeatherLine(location, mock),
    };
  } catch (error) {
    console.error("Today weather context failed:", error);
    return UNAVAILABLE;
  }
}
