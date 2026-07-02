import type { Event } from "@/types";
import type { OutdoorEventsContext, TodayWeatherContext } from "@/lib/weather/types";

const OUTDOOR_PATTERN =
  /\b(outdoor|outside|park|field|stadium|track|playground|courtyard|picnic|tailgate|car line|parking lot|athletic|soccer|baseball|football)\b/i;

const GOOD_WEATHER_PATTERN =
  /\b(sunny|clear|partly cloudy|light breeze|fair|warm)\b/i;

const WATCH_WEATHER_PATTERN =
  /\b(rain|storm|thunder|snow|ice|wind|cold|freezing|fog|overcast|drizzle)\b/i;

export function isOutdoorEvent(event: Event): boolean {
  const haystack = [event.title, event.location, event.description, event.audience]
    .filter(Boolean)
    .join(" ");
  return OUTDOOR_PATTERN.test(haystack);
}

export function getOutdoorEventsContext(
  events: Event[],
  weather: TodayWeatherContext,
): OutdoorEventsContext {
  const outdoorEvents = events.filter(isOutdoorEvent);

  if (outdoorEvents.length === 0) {
    return { hasOutdoorEventsThisWeek: false, helperLine: null };
  }

  const condition = weather.weather?.condition ?? "";
  const looksGood =
    GOOD_WEATHER_PATTERN.test(condition) && !WATCH_WEATHER_PATTERN.test(condition);

  return {
    hasOutdoorEventsThisWeek: true,
    helperLine: looksGood
      ? "Looks like a great day to be outside."
      : "Keep an eye on the weather for outdoor events this week.",
  };
}
