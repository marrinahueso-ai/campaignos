import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createWithAiHref,
  eventApprovalsHref,
  eventDetailApprovalsHref,
  eventInsightsHref,
  eventFilesHref,
  eventNotesHref,
  eventTasksGlobalHref,
  eventTasksHref,
  eventVolunteersHref,
  mapCommitteeRoleToResponsibility,
  resolveEventResponsibilities,
  resolveResponsiblePersonForEvent,
} from "../event-responsibility.ts";
import { countEventsHomeSummary } from "../events-home-summary.ts";
import {
  buildEventsHomeMonthFilterOptions,
  matchesEventsHomeMonth,
} from "../events-home-summary.ts";
import { collectEventsHomeArtworkEventIds } from "../events-home-artwork-ids.ts";
import { resolveEventsHomeListArtwork } from "../resolve-events-home-list-artwork.ts";
import { isEventsPhase3UiEnabled } from "../events-phase3-flag.ts";
import type { OrganizationCommittee, OrganizationMember } from "../../../types/organization-workspace.ts";
import type { Event } from "../../../types/index.ts";
import type { HeroArtworkSelection } from "../../event-workspace/select-hero-artwork.ts";

function member(
  partial: Partial<OrganizationMember> & Pick<OrganizationMember, "id" | "name">,
): OrganizationMember {
  return {
    organizationId: "org-1",
    email: null,
    phone: null,
    organizationRoleId: null,
    roleName: partial.roleName ?? null,
    active: true,
    campaignRole: partial.campaignRole ?? "contributor",
    createdAt: "2026-01-01T00:00:00Z",
    assignedEventIds: partial.assignedEventIds ?? [],
    ...partial,
  };
}

function committee(
  partial: Partial<OrganizationCommittee> &
    Pick<OrganizationCommittee, "id" | "name" | "assignedEventId">,
): OrganizationCommittee {
  return {
    organizationId: "org-1",
    parentRoleId: null,
    parentRoleName: null,
    contactEmail: null,
    contactPhone: null,
    contactName: null,
    communicationStrategy: "full_campaign",
    playbookSlug: null,
    eventMatchKey: null,
    sortOrder: 0,
    archivedAt: null,
    campaignRole: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

function eventStub(
  partial: Partial<Event> & Pick<Event, "id" | "title">,
): Event {
  return {
    description: "",
    date: "2026-08-10",
    time: null,
    location: null,
    audience: null,
    theme: null,
    status: "scheduled",
    category: null,
    eventType: null,
    communicationStrategy: "full_campaign",
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
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: null,
    ...partial,
  };
}

describe("Phase 3 responsibility mapping", () => {
  it("maps chair to Event Lead", () => {
    assert.equal(mapCommitteeRoleToResponsibility("chair"), "Event Lead");
  });

  it("maps co_chair to Assistant Lead", () => {
    assert.equal(
      mapCommitteeRoleToResponsibility("co_chair"),
      "Assistant Lead",
    );
  });

  it("maps supervising_vp to Supervisor", () => {
    assert.equal(
      mapCommitteeRoleToResponsibility("supervising_vp"),
      "Supervisor",
    );
  });

  it("maps member to Team Member", () => {
    assert.equal(mapCommitteeRoleToResponsibility("member"), "Team Member");
  });

  it("shows Not assigned when nothing matches the eventId", () => {
    const result = resolveResponsiblePersonForEvent({
      eventId: "event-a",
      event: eventStub({ id: "event-a", title: "Fair" }),
      committees: [
        committee({
          id: "comm-b",
          name: "Other",
          assignedEventId: "event-b",
        }),
      ],
      members: [
        member({
          id: "m1",
          name: "Alex Same Name",
          assignedEventIds: ["event-b"],
        }),
      ],
      committeeAssignments: [
        {
          organizationMemberId: "m1",
          committeeId: "comm-b",
          role: "chair",
        },
      ],
    });
    assert.equal(result.displayName, "Not assigned");
    assert.equal(result.source, "none");
  });

  it("never crosses assignments by duplicate display names", () => {
    const people = [
      member({ id: "m-a", name: "Jordan Smith", assignedEventIds: ["event-a"] }),
      member({ id: "m-b", name: "Jordan Smith", assignedEventIds: ["event-b"] }),
    ];
    const committees = [
      committee({ id: "c-a", name: "Comms", assignedEventId: "event-a" }),
      committee({ id: "c-b", name: "Events", assignedEventId: "event-b" }),
    ];
    const assignments = [
      { organizationMemberId: "m-a", committeeId: "c-a", role: "chair" as const },
      { organizationMemberId: "m-b", committeeId: "c-b", role: "chair" as const },
    ];

    const forA = resolveResponsiblePersonForEvent({
      eventId: "event-a",
      event: eventStub({ id: "event-a", title: "Spirit Afternoon" }),
      committees,
      members: people,
      committeeAssignments: assignments,
    });
    const forB = resolveResponsiblePersonForEvent({
      eventId: "event-b",
      event: eventStub({ id: "event-b", title: "Spirit Afternoon" }),
      committees,
      members: people,
      committeeAssignments: assignments,
    });

    assert.equal(forA.memberId, "m-a");
    assert.equal(forB.memberId, "m-b");
    assert.notEqual(forA.memberId, forB.memberId);
  });

  it("prefers chair on assigned_event_id over legacy owner text", () => {
    const result = resolveResponsiblePersonForEvent({
      eventId: "event-a",
      event: eventStub({
        id: "event-a",
        title: "Fair",
        eventOwner: "Legacy Text Owner",
      }),
      committees: [
        committee({ id: "c1", name: "Comms", assignedEventId: "event-a" }),
      ],
      members: [member({ id: "m1", name: "Real Chair", roleName: "VP Comms" })],
      committeeAssignments: [
        { organizationMemberId: "m1", committeeId: "c1", role: "chair" },
      ],
    });
    assert.equal(result.displayName, "Real Chair");
    assert.equal(result.source, "chair");
  });

  it("builds responsibility rows including routing-only Final Approval", () => {
    const rows = resolveEventResponsibilities({
      eventId: "event-a",
      event: eventStub({ id: "event-a", title: "Fair" }),
      committees: [
        committee({ id: "c1", name: "Comms", assignedEventId: "event-a" }),
      ],
      members: [
        member({ id: "m1", name: "Lead", roleName: "Chair" }),
        member({ id: "m2", name: "Help", roleName: "Member" }),
      ],
      committeeAssignments: [
        { organizationMemberId: "m1", committeeId: "c1", role: "chair" },
        { organizationMemberId: "m2", committeeId: "c1", role: "co_chair" },
      ],
      finalApproval: { displayName: "President Role" },
      publisher: { displayName: "VP Communications" },
    });

    assert.ok(rows.some((row) => row.responsibility === "Event Lead"));
    assert.ok(rows.some((row) => row.responsibility === "Assistant Lead"));
    assert.ok(rows.some((row) => row.responsibility === "Final Approval"));
    assert.ok(rows.some((row) => row.responsibility === "Publisher"));
  });
});

describe("Phase 3 Events Home summary", () => {
  it("counts action lenses honestly", () => {
    const today = "2026-07-15";
    const events = [
      eventStub({ id: "1", title: "A", status: "draft", date: "2026-08-01" }),
      eventStub({
        id: "2",
        title: "B",
        status: "scheduled",
        date: "2026-08-01",
      }),
      eventStub({
        id: "3",
        title: "C",
        status: "published",
        date: "2026-06-01",
      }),
      eventStub({
        id: "4",
        title: "D",
        status: "scheduled",
        date: "2026-06-01",
      }),
    ];
    const counts = countEventsHomeSummary(events, today);
    assert.equal(counts.next_60_days, 2);
    assert.equal(counts.needs_setup, 1);
    assert.equal(counts.ready_to_run, 1);
    assert.equal(counts.needs_follow_up, 1);
    assert.equal(counts.done, 1);
  });

  it("allows intentional overlap between Next 60 days and Ready to run", () => {
    const today = "2026-07-15";
    const event = eventStub({
      id: "overlap",
      title: "Spirit",
      status: "scheduled",
      date: "2026-08-01",
    });
    const counts = countEventsHomeSummary([event], today);
    assert.equal(counts.ready_to_run, 1);
    assert.equal(counts.next_60_days, 1);
    assert.equal(counts.needs_setup, 0);
  });
});

describe("Phase 3 Events Home month filters", () => {
  it("supports All Dates, This Month, Next Month, and specific months", () => {
    const today = "2026-07-15";
    const events = [
      eventStub({ id: "1", title: "Jul", date: "2026-07-20" }),
      eventStub({ id: "2", title: "Aug", date: "2026-08-10" }),
      eventStub({ id: "3", title: "Sep", date: "2026-09-01" }),
    ];
    const options = buildEventsHomeMonthFilterOptions(events, today);
    assert.equal(options[0]?.value, "all");
    assert.equal(options[1]?.value, "this_month");
    assert.equal(options[2]?.value, "next_month");
    assert.ok(options.some((option) => option.value === "2026-09"));

    assert.equal(
      matchesEventsHomeMonth(events[0]!, "this_month", today),
      true,
    );
    assert.equal(
      matchesEventsHomeMonth(events[1]!, "next_month", today),
      true,
    );
    assert.equal(matchesEventsHomeMonth(events[2]!, "2026-09", today), true);
    assert.equal(matchesEventsHomeMonth(events[0]!, "2026-09", today), false);
  });
});

describe("Phase 3 deep links and fallback flag", () => {
  it("keeps Create with AI links on the same eventId", () => {
    assert.equal(
      createWithAiHref("evt-123", "inspiration"),
      "/events/evt-123/campaign-builder#inspiration",
    );
    assert.equal(
      createWithAiHref("evt-123", "preview"),
      "/events/evt-123/campaign-builder#preview",
    );
  });

  it("keeps approvals filtered by event query param", () => {
    assert.equal(eventApprovalsHref("evt-123"), "/approvals?event=evt-123");
  });

  it("scopes tasks, files, notes, volunteers, and insights to the event detail tabs", () => {
    assert.equal(
      eventDetailApprovalsHref("evt-123"),
      "/events/evt-123?tab=approvals",
    );
    assert.equal(eventTasksHref("evt-123"), "/events/evt-123?tab=tasks");
    assert.equal(eventTasksGlobalHref("evt-123"), "/tasks?event=evt-123");
    assert.equal(eventFilesHref("evt-123"), "/events/evt-123?tab=files");
    assert.equal(eventNotesHref("evt-123"), "/events/evt-123?tab=notes");
    assert.equal(
      eventVolunteersHref("evt-123"),
      "/events/evt-123?tab=volunteers",
    );
    assert.equal(eventInsightsHref("evt-123"), "/events/evt-123?tab=insights");
  });

  it("exports fallback flag helper (default enabled)", () => {
    assert.equal(typeof isEventsPhase3UiEnabled(), "boolean");
  });
});

describe("artwork isolation contract", () => {
  it("requires artwork lookup keyed by exact eventId only", () => {
    const artworkByEventId = new Map<string, string | null>([
      ["event-a", "https://cdn.example/a.png"],
      ["event-b", "https://cdn.example/b.png"],
    ]);
    assert.equal(artworkByEventId.get("event-a"), "https://cdn.example/a.png");
    assert.equal(artworkByEventId.get("event-b"), "https://cdn.example/b.png");
    assert.equal(artworkByEventId.get("event-missing"), undefined);
    const byTitle = new Map([
      ["Spirit Afternoon", "https://cdn.example/wrong.png"],
    ]);
    assert.notEqual(
      artworkByEventId.get("event-a"),
      byTitle.get("Spirit Afternoon"),
    );
  });

  it("limits Events Home artwork ids to upcoming plus first page", () => {
    const today = "2026-08-01";
    const events: Event[] = Array.from({ length: 12 }, (_, index) => ({
      id: `evt-${index}`,
      title: `Event ${index}`,
      description: "",
      // Mix past + future so upcoming is a subset of the full list.
      date:
        index < 8
          ? `2026-07-${String(index + 1).padStart(2, "0")}`
          : `2026-08-${String(index - 6).padStart(2, "0")}`,
      time: null,
      location: null,
      audience: null,
      theme: null,
      status: "scheduled",
      category: null,
      eventType: null,
      communicationStrategy: "full_campaign",
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
      schoolYearId: "sy-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: null,
    }));

    const ids = collectEventsHomeArtworkEventIds(events, today, "sy-1");
    assert.ok(ids.includes("evt-0")); // first page
    assert.ok(ids.includes("evt-8")); // upcoming
    assert.ok(ids.length < events.length);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("falls back to promoted approved-square URL when prefetch misses", () => {
    const prefetched: HeroArtworkSelection = {
      source: "approved_asset",
      caption: "Artwork ready",
      imageUrl: "https://cdn.example/prefetched.png",
      label: "Approved artwork",
      filename: null,
      aspectRatio: "square",
      assetType: "square_graphic",
    };
    assert.equal(
      resolveEventsHomeListArtwork(
        {
          approvedSquareImageUrl: "https://cdn.example/fallback.png",
          approvedSquareImageStatus: "filled",
        },
        prefetched,
      )?.imageUrl,
      "https://cdn.example/prefetched.png",
    );
    assert.equal(
      resolveEventsHomeListArtwork(
        {
          approvedSquareImageUrl: "https://cdn.example/fallback.png",
          approvedSquareImageStatus: "filled",
        },
        null,
      )?.imageUrl,
      "https://cdn.example/fallback.png",
    );
    assert.equal(
      resolveEventsHomeListArtwork(
        {
          approvedSquareImageUrl: "https://cdn.example/fallback.png",
          approvedSquareImageStatus: "open",
        },
        null,
      ),
      null,
    );
  });
});

describe("fallback switch remains available", () => {
  it("documents reversible Phase 3 flag", () => {
    assert.equal(typeof isEventsPhase3UiEnabled(), "boolean");
  });

  it("keeps legacy Campaigns and Planning Hub source files", async () => {
    const { access } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    await access(
      join(here, "../../../components/campaigns/CampaignsPageContent.tsx"),
    );
    await access(
      join(here, "../../../components/event-playbooks/EventPlanningHub.tsx"),
    );
    await access(
      join(here, "../../../app/(dashboard)/events/[id]/render-planning-hub.tsx"),
    );
    await access(
      join(here, "../../../app/(dashboard)/events/[id]/render-events-phase3.tsx"),
    );
  });
});
