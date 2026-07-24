import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectNearbyWeatherEvents,
  getWeatherEventInsight,
} from "../insight.ts";
import type { WeatherNearbyEvent, WeatherSnapshot } from "../types.ts";
import type { TodayPageData } from "../../../types/today.ts";

function snapshot(
  overrides: Partial<WeatherSnapshot> = {},
): WeatherSnapshot {
  return {
    temperatureF: 78,
    condition: "Partly cloudy",
    source: "mock",
    hourly: [
      { hourLabel: "1pm", temperatureF: 80, condition: "Partly cloudy" },
      { hourLabel: "2pm", temperatureF: 81, condition: "Partly cloudy" },
      { hourLabel: "3pm", temperatureF: 82, condition: "Sunny" },
      { hourLabel: "4pm", temperatureF: 80, condition: "Sunny" },
    ],
    ...overrides,
  };
}

describe("getWeatherEventInsight", () => {
  it("mentions a hot outdoor event today with sunscreen/water vibes", () => {
    const events: WeatherNearbyEvent[] = [
      {
        id: "e1",
        title: "Field Day",
        date: "2026-07-24",
        isOutdoor: true,
      },
    ];

    const tip = getWeatherEventInsight(
      snapshot({ temperatureF: 88, condition: "Sunny" }),
      events,
      "2026-07-24",
    );

    assert.ok(tip);
    assert.match(tip.toLowerCase(), /field day/);
    assert.match(tip.toLowerCase(), /sunscreen|water|spf|hydrat|cooler/);
  });

  it("suggests bundling up for a cold event tomorrow", () => {
    const tip = getWeatherEventInsight(
      snapshot({ temperatureF: 34, condition: "Clear", hourly: [] }),
      [
        {
          id: "e2",
          title: "Open House",
          date: "2026-07-25",
          isOutdoor: false,
        },
      ],
      "2026-07-24",
    );

    assert.ok(tip);
    assert.match(tip.toLowerCase(), /open house/);
    assert.match(tip.toLowerCase(), /cold|chilly|bundle|warm|glove|coat/);
    assert.match(tip.toLowerCase(), /tomorrow/);
  });

  it("returns a weather-only tip when no nearby events", () => {
    const tip = getWeatherEventInsight(
      snapshot({ temperatureF: 92, condition: "Clear" }),
      [],
      "2026-07-24",
    );

    assert.ok(tip);
    assert.match(tip.toLowerCase(), /heat|sunscreen|hydrat|melty|water/);
  });

  it("prefers today's event over tomorrow", () => {
    const tip = getWeatherEventInsight(
      snapshot({ temperatureF: 76, condition: "Clear" }),
      [
        {
          id: "tomorrow",
          title: "Tomorrow Fest",
          date: "2026-07-25",
          isOutdoor: true,
        },
        {
          id: "today",
          title: "Today Picnic",
          date: "2026-07-24",
          isOutdoor: true,
        },
      ],
      "2026-07-24",
    );

    assert.match(tip ?? "", /Today Picnic/);
  });
});

describe("collectNearbyWeatherEvents", () => {
  it("keeps only events for today and tomorrow", () => {
    const todayData = {
      thisWeek: [
        {
          id: "a",
          date: "2026-07-24",
          title: "Soccer Night",
          eventTitle: "Soccer Night",
          kind: "event" as const,
          href: "/events/a",
        },
        {
          id: "b",
          date: "2026-07-26",
          title: "Too Far",
          eventTitle: "Too Far",
          kind: "event" as const,
          href: "/events/b",
        },
      ],
      upcomingEvents: [
        {
          eventId: "c",
          title: "Park Cleanup",
          date: "2026-07-25",
          progressPercent: null,
          progressLabel: null,
          statusLine: "",
          href: "/events/c",
          communicationStrategy: "campaign_page",
        },
      ],
      monthEvents: [],
    } as unknown as TodayPageData;

    const nearby = collectNearbyWeatherEvents(todayData, "2026-07-24");
    assert.deepEqual(
      nearby.map((event) => event.id).sort(),
      ["a", "c"],
    );
    assert.equal(nearby.find((event) => event.id === "a")?.isOutdoor, true);
    assert.equal(nearby.find((event) => event.id === "c")?.isOutdoor, true);
  });
});
