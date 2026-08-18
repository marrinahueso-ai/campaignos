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

  it("keeps import work in one supporting flow", () => {
    assert.match(types, /"import"/);
    assert.match(types, /"review"/);
    assert.match(panel, /Bring in calendar/);
    assert.doesNotMatch(panel, /label: "Import"/);
    assert.doesNotMatch(panel, /label: "Review"/);
    assert.doesNotMatch(panel, /label: "Import list"/);
    assert.match(shell, /view === "import"/);
    assert.match(shell, /view === "review"/);
    assert.match(shell, /onViewImportedItems/);
  });

  it("uses soft view pills instead of dense segmented control", () => {
    assert.match(panel, /role="tablist"/);
    assert.match(panel, /DashboardWidgetColorPicker/);
    assert.doesNotMatch(panel, /onShowPostingHeatmapChange\(!showPostingHeatmap\)/);
    assert.doesNotMatch(panel, /border border-cos-border bg-cos-bg p-0\.5/);
  });

  it("does not show Coming up in calendar shell or control panel", () => {
    assert.doesNotMatch(shell, /CalendarComingUpEase/);
    assert.doesNotMatch(panel, /Coming up/);
  });

  it("exposes shared search on month, week, and best-times", () => {
    assert.match(panel, /Search events, times, dates/);
    assert.match(shell, /filterCalendarItemsBySearch/);
    assert.match(shell, /searchQuery/);
    assert.match(shell, /pickCalendarSearchFocusItem/);
    assert.match(shell, /handleSearchQueryChange/);
    assert.match(shell, /highlightedItemIds/);
    assert.match(panel, /SHOW_CALENDAR_SEARCH/);
  });
});
