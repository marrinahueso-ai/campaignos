import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("events ease UI contracts", () => {
  const home = readSrc(
    "../../../components/events-phase3/EventsHomeContent.tsx",
  );
  const ease = readSrc(
    "../../../components/events-phase3/EventsEaseList.tsx",
  );

  it("uses ease focus/queue instead of KPI summary cards", () => {
    assert.match(home, /Create with AI/);
    assert.match(home, /EventsEaseFocusCard/);
    assert.match(home, /EventsEaseMonthGlance/);
    assert.doesNotMatch(home, /EventsHomeSummaryCards/);
    assert.doesNotMatch(home, /EventsUpcomingSection/);
  });

  it("keeps month glance and All month filter surfaces", () => {
    assert.match(ease, /Month at a glance|formatEventsHomeMonthLabel/);
    assert.match(home, /Filter by month and year/);
    assert.match(home, /Full calendar/);
  });
});
