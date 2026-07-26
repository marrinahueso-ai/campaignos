import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("insights ease UI contracts", () => {
  const shell = readSrc("../../../components/insights/InsightsEaseShell.tsx");
  const queries = readSrc("../queries.ts");
  const eventPanel = readSrc(
    "../../../components/events-phase3/EventDetailInsightsEasePanel.tsx",
  );
  const page = readSrc("../../../app/(dashboard)/insights/page.tsx");
  const eventShell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );
  const featureList = readSrc("../../../../docs/product/feature-list.md");

  it("wires /insights to the Ease shell, not the dense InsightsHub", () => {
    assert.match(page, /InsightsEaseShell/);
    assert.doesNotMatch(page, /InsightsHub/);
  });

  it("uses cream/Fraunces Ease chrome with soft platform pills", () => {
    assert.match(shell, /font-display/);
    assert.match(shell, /Organic performance from your Facebook Page/);
    assert.match(shell, /aria-label="Platform filter"/);
    assert.match(shell, /"All"/);
    assert.match(shell, /"Facebook"/);
    assert.match(shell, /"Instagram"/);
    assert.match(shell, /history\.replaceState/);
  });

  it("exposes Org / Connect Meta / Event Insights view pills with ?view=", () => {
    assert.match(shell, /Org Insights/);
    assert.match(shell, /Connect Meta/);
    assert.match(shell, /Event Insights/);
    assert.match(shell, /aria-label="Insights surfaces"/);
    assert.match(shell, /params\.set\("view", next\.view\)/);
    assert.match(shell, /parseInsightsView/);
    assert.match(shell, /view === "connect"/);
    assert.match(shell, /view === "event"/);
    assert.match(shell, /EventDetailInsightsEasePanel/);
    assert.match(shell, /insights-event-picker/);
    assert.match(page, /pickDefaultCreateWithAiEvent/);
    assert.match(page, /getEventInsightsPageData/);
    assert.match(page, /getActiveEvents/);
  });

  it("keeps date-range soft pills and Export CSV / Refresh", () => {
    assert.match(shell, /aria-label="Date range"/);
    assert.match(shell, /7 days/);
    assert.match(shell, /14 days/);
    assert.match(shell, /Export CSV/);
    assert.match(shell, /Refresh/);
    assert.match(shell, /formatLastSyncTitle/);
    assert.match(shell, /syncInsightsAction/);
    assert.doesNotMatch(shell, /formatSyncNote/);
  });

  it("keeps chrome switches instant via local state + history.replaceState", () => {
    assert.match(shell, /history\.replaceState/);
    assert.match(shell, /syncChromeUrl/);
    assert.match(shell, /loadInsightsPageDataAction/);
    assert.match(shell, /loadEventInsightsAction/);
    assert.match(shell, /dataLoading/);
    assert.doesNotMatch(shell, /router\.replace\(/);
    assert.doesNotMatch(shell, /router\.refresh\(/);
    assert.doesNotMatch(shell, /useRouter/);
  });

  it("shows curated KPI strip without drag-and-drop layout editor", () => {
    assert.match(shell, /Overview metrics/);
    assert.match(shell, /"views"/);
    assert.match(shell, /"reach"/);
    assert.match(shell, /"engagement"/);
    assert.doesNotMatch(shell, /saveInsightsLayoutAction/);
    assert.doesNotMatch(shell, /DndContext/);
    assert.doesNotMatch(shell, /InsightsKpiCards/);
  });

  it("matches mockup KPI typography: large serif value, quiet label, forest selected", () => {
    assert.match(shell, /insights-ease-kpi-val/);
    assert.match(shell, /insights-ease-kpi-val--selected/);
    assert.match(shell, /insights-ease-stat-val/);
    assert.match(shell, /text-\[#7a7166\]/);
    assert.match(shell, /border-\[#2f4a3c\] bg-\[#2f4a3c\]/);
    assert.match(shell, /MetricSparkline/);
    assert.match(shell, /#2a7a86/);
    assert.match(shell, /vs prior/);
    assert.doesNotMatch(shell, /tracking-wide uppercase/);
  });

  it("keeps quiet Content overview chart and Top content carousel", () => {
    assert.match(shell, /Content overview/);
    assert.match(shell, /topContentTitle/);
    assert.match(shell, /TOP_CONTENT_SORT_OPTIONS/);
    assert.match(shell, /TopContentCarousel/);
    assert.match(shell, /snap-x snap-mandatory/);
    assert.match(shell, /Scroll top content left/);
    assert.match(shell, /Period total/);
    assert.match(shell, /Best day/);
    assert.doesNotMatch(shell, /Top content by views/);
    assert.doesNotMatch(shell, /Content breakdown/);
    assert.doesNotMatch(shell, /filteredTopPosts\.slice\(0,\s*6\)/);
    assert.match(queries, /TOP_CONTENT_LIMIT = 36/);
  });

  it("sorts Top content client-side with quiet Ease select + ?contentSort=", () => {
    assert.match(shell, /aria-label="Sort top content"/);
    assert.match(shell, /Highest views/);
    assert.match(shell, /Newest/);
    assert.match(shell, /Oldest/);
    assert.match(shell, /Most reactions/);
    assert.match(shell, /Most comments/);
    assert.match(shell, /Most shares/);
    assert.match(shell, /Most engagement/);
    assert.match(shell, /sortTopPosts/);
    assert.match(shell, /parseTopContentSort/);
    assert.match(shell, /contentSort/);
    assert.match(shell, /params\.set\("contentSort", next\.contentSort\)/);
    assert.match(shell, /history\.replaceState/);
    assert.doesNotMatch(shell, /getInsightsDataNote/);
    assert.doesNotMatch(shell, /from your Page/);
  });

  it("matches Connect Meta empty purpose and organic-only scope", () => {
    assert.match(shell, /Connect Meta to get started/);
    assert.match(shell, /No ads data/);
    assert.match(shell, /No audience demographics on this page/);
    assert.match(shell, /Connect with Facebook/);
    assert.match(shell, /Meta settings/);
    assert.match(shell, /Why we ask for Page Insights/);
  });

  it("keeps rule-based From your metrics without LLM narrative", () => {
    assert.match(shell, /From your metrics/);
    assert.match(shell, /InsightsRecommendationsDrawer/);
    assert.doesNotMatch(shell, /generateText|openai|llm/i);
  });

  it("wires event Insights tab to Ease panel, not EventInsightsTab", () => {
    assert.match(eventShell, /EventDetailInsightsEasePanel/);
    assert.doesNotMatch(eventShell, /EventInsightsTab/);
  });

  it("matches Event Insights Ease panel: KPIs, posts, refresh footer (no comparison banner)", () => {
    assert.match(eventPanel, /Event Insights · organic Meta metrics/);
    assert.match(eventPanel, /event-insights-kpi-strip/);
    assert.match(eventPanel, /Link clicks/);
    assert.match(eventPanel, /Posts for this event/);
    assert.match(eventPanel, /Published slots linked to \{eventTitle\}/);
    assert.match(eventPanel, /formatLastSyncTitle/);
    assert.match(eventPanel, /event-insights-sync-footer/);
    assert.match(eventPanel, /Open Org Insights/);
    assert.doesNotMatch(eventPanel, /Synced from Meta/);
    assert.match(eventPanel, /shadow-none/);
    assert.doesNotMatch(eventPanel, /event-insights-comparison/);
    assert.doesNotMatch(eventPanel, /not an AI score/);
    assert.doesNotMatch(eventPanel, /than typical for a/);
    assert.doesNotMatch(eventPanel, /Views Total|By post/);
    assert.doesNotMatch(eventPanel, /Age & gender/);
    assert.doesNotMatch(eventPanel, /this campaign/);
    assert.doesNotMatch(eventPanel, /EventInsightsTab/);
  });

  it("matches Event KPI strip mockup: quiet labels + large serif values", () => {
    assert.match(eventPanel, /text-\[#7a7166\]/);
    assert.match(eventPanel, /insights-ease-kpi-val/);
    assert.match(eventPanel, /border-\[rgba\(42,38,34,0\.1\)\]/);
    assert.match(eventPanel, /bg-\[#fffcf7\]/);
    assert.match(eventPanel, /xl:grid-cols-5/);
    assert.match(eventPanel, /cursor-default/);
  });

  it("keeps Event Insights hub composition soft: page head + quiet picker", () => {
    assert.match(shell, /← Org Insights/);
    assert.match(shell, /Event → Insights tab/);
    assert.match(shell, /insights-event-picker/);
    assert.match(shell, /bg-transparent/);
    assert.match(shell, /sr-only/);
    assert.doesNotMatch(shell, /Open full event/);
  });

  it("marks Insights Ease redesign as shipped in feature-list", () => {
    assert.match(
      featureList,
      /Ease redesign — Org \+ Event Insights[\s\S]*?— \*\*shipped\*\*/,
    );
  });

  it("pins event Insights loaders to the active org via school_years", () => {
    const eventQueries = readSrc("../event-queries.ts");
    const actions = readSrc("../actions.ts");
    assert.match(eventQueries, /getOrganizationSchoolYearIds/);
    assert.match(eventQueries, /loadActiveOrgEventTitle/);
    assert.match(eventQueries, /Active-org pin/);
    assert.match(eventQueries, /schoolYearIds\.includes\(schoolYearId\)/);
    assert.match(actions, /getEventInsightsPageData\(trimmed\)/);
    // loadEventInsightsAction must inherit the pin (no parallel unscoped loader).
    assert.doesNotMatch(actions, /from\("events"\)/);
  });
});
