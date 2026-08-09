import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("dashboard ease UI contracts", () => {
  const page = readSrc("../../../app/(dashboard)/dashboard/page.tsx");
  const overview = readSrc("../../../components/today/DashboardOverview.tsx");
  const hero = readSrc("../../../components/today/TodayHero.tsx");
  const upNext = readSrc("../../../components/today/widgets/UpNextWidget.tsx");
  const attention = readSrc("../../../components/today/widgets/AttentionWidget.tsx");
  const weather = readSrc("../../../components/today/widgets/WeatherWidget.tsx");
  const catalog = readSrc("../dashboard-widgets.ts");
  const todayData = readSrc("../build-today-data.ts");
  const todayQueries = readSrc("../queries.ts");

  it("routes authenticated home through DashboardOverview + TodayHero", () => {
    assert.match(page, /DashboardOverview/);
    assert.match(page, /TodayHero/);
    assert.match(page, /studio-page/);
  });

  it("passes dashboard widgets through explicit RSC slots", () => {
    assert.match(page, /upNextWidget=\{widgets\.up_next\}/);
    assert.match(page, /weatherWidget=\{widgets\.weather\}/);
    assert.doesNotMatch(page, /widgets=\{widgets\}/);
    assert.match(overview, /upNextWidget\?: React\.ReactNode/);
    assert.match(overview, /const widgets: Partial<Record<DashboardWidgetId, React\.ReactNode>>/);
  });

  it("uses calm greeting hero without attention-count chrome", () => {
    assert.match(hero, /getTimeOfDayGreeting/);
    assert.match(hero, /font-display text-4xl/);
    assert.doesNotMatch(hero, /\{attentionCount\}/);
  });

  it("prefers edit-profile membership display name for the greeting", () => {
    assert.match(
      todayQueries,
      /membership\?\.user\.displayName\?\.trim\(\)\s*\|\|/,
    );
    assert.match(todayQueries, /authUser\?\.displayName\?\.trim\(\)/);
  });

  it("keeps Add / Edit layout controls without a dense section title", () => {
    assert.match(overview, />\s*Add\s*<\//);
    assert.match(overview, />\s*Edit\s*<\//);
    assert.match(overview, /DashboardAddWidgetsModal/);
    assert.doesNotMatch(overview, /Your overview/i);
  });

  it("uses org/team customer copy — not school-only or workspace jargon", () => {
    assert.match(weather, /weather city in Settings/);
    assert.doesNotMatch(weather, /school city/i);
    assert.match(catalog, /Local weather for your organization/);
    assert.match(catalog, /Month view of your events/);
    assert.doesNotMatch(upNext, /Open campaign/);
    assert.match(upNext, /Open event/);
    assert.doesNotMatch(todayData, /Open \$\{.*\} workspace/);
  });

  it("deep-links tasks through Tasks Ease scope + pulse params", () => {
    assert.match(attention, /\/tasks\?scope=mine&pulse=week/);
    assert.doesNotMatch(attention, /tab=my_tasks/);
  });
});
