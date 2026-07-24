import { textLooksOutdoor } from "@/lib/weather/outdoor-events";
import type { WeatherNearbyEvent, WeatherSnapshot } from "@/lib/weather/types";
import { addDaysToDateOnly } from "@/lib/utils/dates";
import type { TodayPageData } from "@/types/today";

type WeatherMood =
  | "scorching"
  | "hot"
  | "warm"
  | "mild"
  | "cool"
  | "cold"
  | "rainy"
  | "stormy"
  | "snowy";

/**
 * Fun, short tip tying local weather to school events today or tomorrow.
 * Stable for a given event + condition so the card doesn't shuffle on refresh.
 */
export function getWeatherEventInsight(
  weather: WeatherSnapshot | null,
  nearbyEvents: WeatherNearbyEvent[],
  today: string,
): string | null {
  if (!weather) return null;

  const mood = resolveWeatherMood(weather);
  const event = pickPrimaryEvent(nearbyEvents, today);
  if (!event) {
    return weatherOnlyTip(mood, weather);
  }

  const when = event.date === today ? "today" : "tomorrow";
  const title = shortenEventTitle(event.title);
  const outdoor = event.isOutdoor;
  const lines = eventAwareTips(mood, { title, when, outdoor });
  return pickStable(lines, `${event.id}:${mood}:${weather.condition}`);
}

export function collectNearbyWeatherEvents(
  todayData: TodayPageData,
  today: string,
): WeatherNearbyEvent[] {
  const tomorrow = addDaysToDateOnly(today, 1);
  const byId = new Map<string, WeatherNearbyEvent>();

  for (const entry of todayData.thisWeek) {
    if (entry.kind !== "event") continue;
    if (entry.date !== today && entry.date !== tomorrow) continue;
    const title = entry.eventTitle ?? entry.title;
    byId.set(entry.id, {
      id: entry.id,
      title,
      date: entry.date,
      isOutdoor: textLooksOutdoor(title),
    });
  }

  for (const entry of todayData.upcomingEvents) {
    if (entry.date !== today && entry.date !== tomorrow) continue;
    const existing = byId.get(entry.eventId);
    byId.set(entry.eventId, {
      id: entry.eventId,
      title: entry.title,
      date: entry.date,
      isOutdoor: existing?.isOutdoor ?? textLooksOutdoor(entry.title),
    });
  }

  for (const entry of todayData.monthEvents) {
    if (entry.kind !== "event") continue;
    if (entry.date !== today && entry.date !== tomorrow) continue;
    if (byId.has(entry.id)) continue;
    const title = entry.eventTitle ?? entry.title;
    byId.set(entry.id, {
      id: entry.id,
      title,
      date: entry.date,
      isOutdoor: textLooksOutdoor(title),
    });
  }

  return [...byId.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title);
  });
}

function pickPrimaryEvent(
  events: WeatherNearbyEvent[],
  today: string,
): WeatherNearbyEvent | null {
  if (events.length === 0) return null;
  const todayFirst = events.find((event) => event.date === today);
  return todayFirst ?? events[0] ?? null;
}

function resolveWeatherMood(weather: WeatherSnapshot): WeatherMood {
  const condition = weather.condition.toLowerCase();
  const high = Math.max(
    weather.temperatureF,
    ...weather.hourly.map((hour) => hour.temperatureF),
  );

  if (/\bstorm|thunder/.test(condition)) return "stormy";
  if (/\brain|drizzle/.test(condition)) return "rainy";
  if (/\bsnow|ice|freez/.test(condition)) return "snowy";
  if (high >= 90) return "scorching";
  if (high >= 82) return "hot";
  if (high >= 72) return "warm";
  if (high >= 58) return "mild";
  if (high >= 42) return "cool";
  return "cold";
}

function eventAwareTips(
  mood: WeatherMood,
  ctx: { title: string; when: "today" | "tomorrow"; outdoor: boolean },
): string[] {
  const { title, when, outdoor } = ctx;
  const day = when === "today" ? "today" : "tomorrow";
  const outdoorBit = outdoor ? "outside" : "on campus";

  switch (mood) {
    case "scorching":
      return outdoor
        ? [
            `${title} ${day} looks sizzling - water bottles and sunscreen are non-negotiable.`,
            `It's a scorcher for ${title} ${day}. Shade, hydration, and SPF are your event crew.`,
            `${day === "today" ? "Today's" : "Tomorrow's"} heat + ${title}? Pack coolers like you mean it.`,
          ]
        : [
            `${title} ${day} lands on a real heat wave - keep volunteers cool and hydrated.`,
            `Hot one for ${title} ${day}. A water station will make you the hero.`,
          ];
    case "hot":
      return outdoor
        ? [
            `${title} ${day} under this sun? Don't forget water and sunscreen.`,
            `Warm welcome for ${title} ${day} - light clothes, big hats, bigger water jugs.`,
            `${title} is ${day} and it's toasty ${outdoorBit}. SPF up before the first smile.`,
          ]
        : [
            `${title} ${day} comes with summer energy - keep the indoor crew hydrated too.`,
            `It's a hot one around ${title} ${day}. A cold drink table never hurts.`,
          ];
    case "warm":
      return [
        `${title} ${day} looks lovely - perfect weather to show up early and enjoy it.`,
        `Nice and warm for ${title} ${day}. Maybe leave the heavy coats at home.`,
        `${title} ${day}: golden weather energy. Grab a smile and maybe some sunscreen.`,
      ];
    case "mild":
      return [
        `${title} ${day} gets a gentle forecast - jacket optional, good vibes required.`,
        `Mild and easy for ${title} ${day}. One of those "just right" event days.`,
        `${title} ${day} looks comfortable ${outdoorBit}. You're cleared for a great turnout.`,
      ];
    case "cool":
      return outdoor
        ? [
            `Bundle up a bit for ${title} ${day} - that cool air sneaks up outside.`,
            `${title} ${day} looks crisp. Layers for volunteers, cocoa for the win.`,
            `Cool snap for ${title} ${day}. Cozy layers beat fashion regrets.`,
          ]
        : [
            `${title} ${day} brings a chill - keep a sweater near the check-in table.`,
            `A little cool for ${title} ${day}. Warm smiles, warmer cardigans.`,
          ];
    case "cold":
      return [
        `${title} ${day} looks chilly - bundle up the greeters and pack the hand warmers.`,
        `Cold day for ${title} ${day}. Hats, gloves, and hot drinks = happy helpers.`,
        `${title} ${day} in this cold? Lean into cozy - blankets welcome.`,
      ];
    case "rainy":
      return outdoor
        ? [
            `Rain may join ${title} ${day}. Umbrellas, tarps, and a backup plan are your friends.`,
            `${title} ${day} could get drippy - waterproof the clipboard and the spirit.`,
            `Showers possible for ${title} ${day}. Ponchos beat puddle shoes of doom.`,
          ]
        : [
            `Rainy vibes around ${title} ${day} - great day to own the cozy indoor welcome.`,
            `${title} ${day} with rain outside? Extra umbrellas at the door will steal hearts.`,
          ];
    case "stormy":
      return [
        `Storm watch near ${title} ${day} - keep an eye on alerts and have an indoor Plan B.`,
        `${title} ${day} may get dramatic skies. Safety first, then the celebration.`,
        `Wild weather possible around ${title} ${day}. Check updates before folks head out.`,
      ];
    case "snowy":
      return [
        `${title} ${day} might get a dusting - boots, salt, and patience recommended.`,
        `Snow vibes for ${title} ${day}. Hot cocoa beats late arrivals (but both are fine).`,
        `${title} ${day} in the cold white stuff? Bundle up and leave early.`,
      ];
  }
}

function weatherOnlyTip(mood: WeatherMood, weather: WeatherSnapshot): string {
  const lines: Record<WeatherMood, string[]> = {
    scorching: [
      "Heat advisory energy - water first, heroics second.",
      "It's a melty one. Sunscreen is basically a love language today.",
    ],
    hot: [
      "Hot day ahead - hydrate like your clipboard depends on it.",
      "Sun's out. Sunscreen and a cold drink wouldn't hurt.",
    ],
    warm: [
      "Warm and friendly out there - a good day to get outside for a minute.",
      "Nice weather day. Windows down, stress levels optional.",
    ],
    mild: [
      "Mild and easy - the forecast is basically a deep breath.",
      "Comfortable skies today. Enjoy the calm while it lasts.",
    ],
    cool: [
      "Cool air rolling in - grab a layer before you head out.",
      "Crisp day vibes. Jacket now, gratitude later.",
    ],
    cold: [
      "Bundle up - it's a cold one out there.",
      "Chilly forecast. Warm coat, warmer coffee.",
    ],
    rainy: [
      "Rain on the radar - umbrella beats optimism alone.",
      "Wet sidewalks ahead. Cute boots encouraged.",
    ],
    stormy: [
      "Stormy stretch possible - keep an eye on the sky.",
      "Dramatic weather incoming. Charge the phone, watch the alerts.",
    ],
    snowy: [
      "Snow day energy - leave early and drive like a librarian.",
      "Flurries possible. Cozy layers and careful roads.",
    ],
  };

  return pickStable(lines[mood], `solo:${mood}:${Math.round(weather.temperatureF)}`);
}

function shortenEventTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 42) return trimmed;
  return `${trimmed.slice(0, 39).trimEnd()}…`;
}

function pickStable(lines: string[], seed: string): string {
  if (lines.length === 0) return "Keep an eye on the sky — and your event checklist.";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return lines[hash % lines.length]!;
}
