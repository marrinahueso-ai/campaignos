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
  const alsoAhead = readSrc(
    "../../../components/events-phase3/EventsAlsoAheadList.tsx",
  );
  const overview = readSrc(
    "../../../components/events-phase3/EventWorkspaceOverviewPanel.tsx",
  );
  const manageMenu = readSrc(
    "../../../components/event-workspace/EventManageMenu.tsx",
  );
  const page = readSrc("../../../app/(dashboard)/events/page.tsx");

  it("opens Create Event as a modal popout from New event", () => {
    assert.match(home, /CreateEventModal/);
    assert.match(home, /setCreateOpen\(true\)/);
    assert.match(home, /playbookOptions/);
    assert.doesNotMatch(home, /href="\/events\/create"/);
  });

  it("hosts selected-event workspace instead of focus/queue stack", () => {
    assert.match(home, /Create with AI/);
    assert.match(home, /EventWorkspaceOverviewPanel/);
    assert.match(home, /EventsAlsoAheadList/);
    assert.match(home, /variant="home"/);
    assert.match(home, /showWhatsNext=\{false\}/);
    assert.doesNotMatch(home, /EventsEaseFocusCard/);
    assert.doesNotMatch(home, /EventsHomeSummaryCards/);
    assert.doesNotMatch(home, /EventsUpcomingSection/);
    assert.doesNotMatch(home, /EventsEaseMonthGlance/);
    assert.doesNotMatch(home, /Next Best Action/i);
    assert.doesNotMatch(home, /Open Workspace/i);
  });

  it("selects via untrusted ?event= and loads one event's stats with stale guard", () => {
    assert.match(home, /searchParams\.get\("event"\)/);
    assert.match(home, /resolveSelectedEventsHomeEvent/);
    assert.match(home, /refreshEventDetailHeroStatsAction/);
    assert.match(home, /selectedEventIdRef/);
    assert.match(home, /requestEventId !== selectedEventIdRef\.current/);
    assert.match(page, /getEventDetailHeroStats/);
    assert.match(page, /initialSelectedStats/);
    assert.match(page, /requestedEventId/);
  });

  it("keeps simplified filter pills and full calendar link", () => {
    assert.match(home, /PULSE_TABS/);
    assert.match(home, /Upcoming/);
    assert.match(home, /Next month/);
    assert.match(home, /Archived/);
    assert.match(home, /Full calendar/);
    assert.match(ease, /Upcoming · Next month · All · Archived/);
    assert.doesNotMatch(home, /Needs setup|Ready to run|Follow-up|Month at a glance/i);
  });

  it("expands Also Ahead and uses AppImage thumbs", () => {
    assert.match(alsoAhead, /Show all events/);
    assert.match(alsoAhead, /Show less/);
    assert.match(alsoAhead, /AppImage/);
    assert.match(alsoAhead, /preset="thumb"/);
    assert.match(home, /EVENTS_ALSO_AHEAD_COLLAPSED_COUNT/);
  });

  it("wires invite drawer + event manage copy on Events home", () => {
    assert.match(home, /InviteEventMemberDrawer/);
    assert.match(home, /canManagePeople/);
    assert.match(home, /manageEntityNoun="event"/);
    assert.match(manageMenu, /entityNoun/);
    assert.match(manageMenu, /Archive \$\{nounTitle\}/);
    assert.match(manageMenu, /Delete \{nounTitle\}/);
  });

  it("keeps Event ID overview What's Next while home strips it", () => {
    assert.match(overview, /showWhatsNext/);
    assert.match(overview, /What’s Next/);
    assert.match(overview, /Attention Needed/);
    assert.match(overview, / Volunteer staffing isn't set up yet|Volunteer staffing isn&apos;t set up yet|isn&apos;t set up yet/);
    assert.match(overview, /preset="hero"/);
    assert.match(overview, /aspect-square/);
    assert.match(overview, /lg:w-\[400px\]/);
    assert.match(overview, /object-contain/);
    assert.doesNotMatch(overview, /lg:h-\[380px\]/);
    assert.doesNotMatch(overview, /lg:w-3\/5/);
    assert.doesNotMatch(overview, /\b9 Roles\b/);
  });

  it("navigates workspace cards to Event ID deep tabs", () => {
    assert.match(home, /\/events\/\$\{encodeURIComponent\(eventId\)\}\?tab=/);
    assert.match(home, /handleSelectTab/);
  });

  it("exposes artwork enlarge and download on list thumbnails helpers", () => {
    const artworkHover = readSrc(
      "../../../components/artwork/ArtworkHoverThumbnail.tsx",
    );
    assert.match(ease, /ArtworkHoverThumbnail/);
    assert.match(ease, /ArtworkPreviewActions/);
    assert.match(artworkHover, /Enlarge artwork/);
    assert.match(artworkHover, /Download artwork/);
  });

  it("requests square Supabase transforms for poster thumbs (no sliced/squished art)", () => {
    const artworkHover = readSrc(
      "../../../components/artwork/ArtworkHoverThumbnail.tsx",
    );
    assert.match(artworkHover, /displayHeight=\{compact \? 128 : 256\}/);
    assert.match(artworkHover, /resize=\{compact \? "cover" : "contain"\}/);
    assert.match(ease, /EventsEaseQueueRow/);
    assert.match(ease, /h-12 w-12 rounded-\[14px\] sm:h-14 sm:w-14/);
  });
});
