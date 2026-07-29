import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("calendar ease UI contracts", () => {
  const shell = readSrc(
    "../../../components/unified-calendar/UnifiedCalendarShell.tsx",
  );
  const panel = readSrc(
    "../../../components/unified-calendar/UnifiedCalendarControlPanel.tsx",
  );
  const types = readSrc("../../../types/communications-calendar.ts");

  it("treats Best times as a first-class view", () => {
    assert.match(types, /"best-times"/);
    assert.match(panel, /label: "Best times"/);
    assert.match(shell, /view === "best-times"/);
    assert.match(shell, /showHeatmap/);
  });

  it("keeps Import and Review as in-calendar tabs", () => {
    assert.match(types, /"import"/);
    assert.match(types, /"review"/);
    assert.match(panel, /label: "Import"/);
    assert.match(panel, /label: "Review"/);
    assert.match(shell, /view === "import"/);
    assert.match(shell, /view === "review"/);
    assert.doesNotMatch(panel, /href="\/calendar\/import"/);
  });

  it("uses soft view pills instead of dense segmented control", () => {
    assert.match(panel, /role="tablist"/);
    assert.match(panel, /DashboardWidgetColorPicker/);
    assert.doesNotMatch(panel, /onShowPostingHeatmapChange\(!showPostingHeatmap\)/);
    assert.doesNotMatch(panel, /border border-cos-border bg-cos-bg p-0\.5/);
  });

  it("places Coming up under the month grid", () => {
    assert.match(shell, /CalendarComingUpEase/);
    assert.doesNotMatch(panel, /Coming up/);
  });

  it("exposes shared search on month, week, and best-times", () => {
    assert.match(panel, /Search events, times, dates/);
    assert.match(shell, /filterCalendarItemsBySearch/);
    assert.match(shell, /searchQuery/);
    assert.match(panel, /SHOW_CALENDAR_SEARCH/);
  });
});
