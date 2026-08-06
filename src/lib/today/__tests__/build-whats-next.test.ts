import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampaignIntelligence } from "../../campaign-intelligence/types.ts";
import type { Event } from "../../../types/index.ts";
import { buildWhatsNext } from "../build-today-data.ts";

function event(
  id: string,
  title: string,
  date: string,
  strategy: Event["communicationStrategy"] = "full_campaign",
): Event {
  return {
    id,
    title,
    description: "",
    date,
    time: null,
    location: null,
    audience: null,
    theme: null,
    status: "scheduled",
    category: null,
    eventType: null,
    communicationStrategy: strategy,
    calendarImportId: null,
    eventOwner: null,
    approvalOrganizationRoleId: null,
    budget: null,
    volunteerNeeds: null,
    goal: null,
    expectedAttendance: null,
    planningQuickLinks: {},
    planningVendors: [],
    approvedSquareImageUrl: null,
    approvedSquareImageStatus: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
  };
}

function intelligence(
  eventId: string,
  overrides: Partial<CampaignIntelligence> = {},
): CampaignIntelligence {
  return {
    eventId,
    communicationStrategy: "full_campaign",
    completionPercent: 40,
    readinessLabel: "needs_attention",
    readinessDisplay: "Needs attention",
    summary: "A few steps still open",
    nextAction: {
      verb: "Continue",
      description: "Event workspace",
      href: `/events/${eventId}`,
    },
    doneItems: [],
    needsAttention: [],
    missingPieces: [],
    overdueItems: [],
    waitingItems: [],
    blockedItems: [],
    ...overrides,
  };
}

describe("buildWhatsNext", () => {
  it("picks the soonest upcoming event by date, not full-campaign priority", () => {
    const playdate = event(
      "playdate",
      "New Family Playdate",
      "2026-08-08",
      "reminder_only",
    );
    const jenis = event(
      "jenis",
      "Jeni's Ice Cream",
      "2026-08-10",
      "full_campaign",
    );

    const whatsNext = buildWhatsNext({
      today: "2026-08-06",
      firstName: "Marrina",
      planningItems: [],
      events: [jenis, playdate],
      monthEvents: [],
      weekStripEvents: [],
      weekEvents: [],
      stepsByEventId: new Map(),
      intelligenceByEventId: new Map([
        [jenis.id, intelligence(jenis.id)],
        [playdate.id, intelligence(playdate.id, {
          communicationStrategy: "reminder_only",
        })],
      ]),
    });

    assert.equal(whatsNext.eventId, "playdate");
    assert.match(whatsNext.title, /New Family Playdate/);
  });

  it("includes calendar-only events when they are the next date", () => {
    const playdate = event(
      "playdate",
      "New Family Playdate",
      "2026-08-08",
      "calendar_only",
    );
    const jenis = event(
      "jenis",
      "Jeni's Ice Cream",
      "2026-08-10",
      "full_campaign",
    );

    const whatsNext = buildWhatsNext({
      today: "2026-08-06",
      firstName: "Marrina",
      planningItems: [],
      events: [jenis, playdate],
      monthEvents: [],
      weekStripEvents: [],
      weekEvents: [],
      stepsByEventId: new Map(),
      intelligenceByEventId: new Map([
        [
          playdate.id,
          intelligence(playdate.id, {
            communicationStrategy: "calendar_only",
            readinessLabel: "calendar_only",
            summary: "On the calendar only",
            nextAction: null,
          }),
        ],
        [jenis.id, intelligence(jenis.id)],
      ]),
    });

    assert.equal(whatsNext.eventId, "playdate");
    assert.equal(whatsNext.kind, "event");
    assert.equal(whatsNext.title, "New Family Playdate");
  });
});
