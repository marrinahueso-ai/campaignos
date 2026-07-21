import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  emptyCommunicationsSection,
  formatCommunicationsSectionLines,
  formatOrgCommunicationsSectionLines,
} from "../communications-format.ts";
import {
  emptyOrgVolunteersSection,
  emptyVolunteersSection,
  formatOrgVolunteersSectionLines,
  formatVolunteersSectionLines,
} from "../volunteers-format.ts";

describe("formatVolunteersSectionLines", () => {
  it("reports open shifts when connected", () => {
    const lines = formatVolunteersSectionLines({
      ...emptyVolunteersSection(["who hasn’t responded"]),
      connected: true,
      sourceStatus: "connected",
      summary: {
        openSpots: 4,
        filledSpots: 8,
        totalSpots: 12,
        filledPercent: 67,
        needsHelpCount: 1,
        assignmentCount: 3,
      },
      shiftsNeedingHelp: [
        {
          name: "Setup",
          openSpots: 4,
          status: "High Need",
          groupName: null,
        },
      ],
      signupReminderSuggested: true,
    });
    const text = lines.join("\n");
    assert.match(text, /4 open spot/);
    assert.match(text, /Setup/);
    assert.match(text, /Signup reminder: yes/);
    assert.match(text, /can’t see yet/i);
  });

  it("admits when SignUpGenius is not connected", () => {
    const lines = formatVolunteersSectionLines(
      emptyVolunteersSection(["SignUpGenius is not connected for this event"]),
    );
    assert.match(lines.join("\n"), /isn’t connected/i);
  });
});

describe("formatCommunicationsSectionLines", () => {
  it("reports missing social and draft emails from pack", () => {
    const lines = formatCommunicationsSectionLines({
      ...emptyCommunicationsSection(["Family view counts"]),
      playbookStepsLoaded: true,
      stepCount: 3,
      email: {
        completedCount: 0,
        upcomingCount: 1,
        completed: [],
        upcoming: [
          {
            id: "1",
            title: "Family blast",
            channel: "email",
            dueDate: "2026-07-25",
            status: "upcoming",
          },
        ],
      },
      facebook: {
        completedCount: 0,
        upcomingCount: 1,
        publishedOrPostedCount: 0,
        completed: [],
        upcoming: [
          {
            id: "2",
            title: "FB post",
            channel: "facebook",
            dueDate: "2026-07-22",
            status: "upcoming",
          },
        ],
      },
      socialMissing: [
        {
          id: "2",
          title: "FB post",
          channel: "facebook",
          dueDate: "2026-07-22",
          status: "upcoming",
        },
      ],
      draftEmails: [
        { id: "d1", label: "email (draft)", channel: "email", status: "draft" },
      ],
    });
    const text = lines.join("\n");
    assert.match(text, /Families email/);
    assert.match(text, /Missing social posts/);
    assert.match(text, /FB post/);
    assert.match(text, /Draft emails: 1/);
    assert.match(text, /can’t see yet/i);
  });
});

describe("org Phase 3 formatters", () => {
  it("summarizes org volunteer and comms gaps", () => {
    const volunteerLines = formatOrgVolunteersSectionLines({
      ...emptyOrgVolunteersSection(["who hasn’t responded"]),
      eventsWithVolunteerData: 1,
      eventsNeedingVolunteers: [
        {
          eventId: "e1",
          eventTitle: "Carnival",
          connected: true,
          openSpots: 5,
          needsHelpCount: 2,
          signupReminderSuggested: true,
        },
      ],
    });
    assert.match(volunteerLines.join("\n"), /Carnival \(5 open\)/);

    const commsLines = formatOrgCommunicationsSectionLines({
      eventsWithPlaybooks: 1,
      eventsWithGaps: [
        {
          eventId: "e1",
          eventTitle: "Carnival",
          socialMissingCount: 2,
          draftEmailCount: 1,
          missingFlyerCount: 0,
          nextDueTitle: "FB post",
          nextDueDate: "2026-07-22",
        },
      ],
      socialMissingTotal: 2,
      draftEmailTotal: 1,
      missingFlyerTotal: 0,
      dueTodayTotal: 0,
      unavailable: ["Family view counts"],
    });
    assert.match(commsLines.join("\n"), /Communications gaps/);
    assert.match(commsLines.join("\n"), /2 social missing/);
  });
});
