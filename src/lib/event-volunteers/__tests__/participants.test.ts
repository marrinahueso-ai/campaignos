import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterParticipantsByDateAllowlist,
  filterParticipantsByRole,
  filterParticipantsBySearch,
  paginateList,
  volunteerInitials,
} from "@/lib/event-volunteers/participant-list";
import {
  buildVolunteerRosterSections,
  rosterProgressTone,
} from "@/lib/event-volunteers/roster-groups";
import {
  normalizeSignUpGeniusPayload,
  parseSignUpGeniusParticipants,
} from "@/lib/event-volunteers/signupgenius-normalize";
import type {
  VolunteerAssignmentView,
  VolunteerParticipantView,
} from "@/lib/event-volunteers/types";

describe("signupgenius participant parse", () => {
  it("parses named participants without copying email", () => {
    const result = normalizeSignUpGeniusPayload(
      {
        shownames: true,
        participants: {
          "1816936636": [
            {
              firstname: "Ada",
              lastname: "Lovelace",
              email: "ada@example.com",
              participantid: 99,
            },
          ],
        },
        slots: {
          "824807901": {
            starttime: "August, 05 2026 14:00:00",
            endtime: "August, 05 2026 17:00:00",
            location: "Gym",
            items: [
              {
                item: "General Sorter",
                qty: 4,
                qtyTaken: 1,
                slotitemid: 1816936636,
                itemorder: 1,
              },
            ],
          },
        },
      },
      {
        sourceTitle: "Supply Sort",
        sourceUrl:
          "https://www.signupgenius.com/go/10C0D45ADAB2FA7FEC16-64779342-eesback",
      },
    );

    assert.ok(!("error" in result));
    assert.equal(result.participants.length, 1);
    assert.equal(result.participants[0]?.name, "Ada Lovelace");
    assert.equal(result.participants[0]?.roleName, "General Sorter");
    assert.equal(result.participants[0]?.assignmentExternalKey, "1816936636");
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /ada@example\.com|email/i);
  });

  it("returns empty participants when names are not public", () => {
    const result = normalizeSignUpGeniusPayload(
      {
        shownames: false,
        participants: {},
        slots: {
          "1": {
            starttime: "August, 05 2026 14:00:00",
            endtime: "August, 05 2026 17:00:00",
            items: [
              {
                item: "Setup",
                qty: 2,
                qtyTaken: 2,
                slotitemid: 10,
                itemorder: 1,
              },
            ],
          },
        },
      },
      {
        sourceUrl:
          "https://www.signupgenius.com/go/10C0D45ADAB2FA7FEC16-64779342-eesback",
      },
    );
    assert.ok(!("error" in result));
    assert.equal(result.participants.length, 0);
    assert.equal(result.totals.filledSpots, 2);
  });

  it("skips participant rows without a display name", () => {
    const people = parseSignUpGeniusParticipants(
      {
        "10": [{ email: "x@y.com" }, { firstname: "Only" }],
      },
      new Map([
        [
          "10",
          {
            externalKey: "10",
            name: "Lead",
            quantityRequested: 1,
            quantityFilled: 1,
            quantityOpen: 0,
          },
        ],
      ]),
    );
    assert.equal(people.length, 1);
    assert.equal(people[0]?.name, "Only");
  });
});

describe("participant list helpers", () => {
  const people = [
    {
      participantKey: "1",
      assignmentExternalKey: "a",
      name: "Ada Lovelace",
      roleName: "General Sorter",
      date: "2026-08-05",
      status: "confirmed" as const,
    },
    {
      participantKey: "2",
      assignmentExternalKey: "b",
      name: "Grace Hopper",
      roleName: "Lead Sorter",
      date: "2026-08-06",
      status: "confirmed" as const,
    },
  ];

  it("filters by sticky date allowlist", () => {
    const filtered = filterParticipantsByDateAllowlist(people, ["2026-08-05"]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.name, "Ada Lovelace");
  });

  it("searches by name or role and filters role", () => {
    assert.equal(filterParticipantsBySearch(people, "hopper").length, 1);
    assert.equal(filterParticipantsBySearch(people, "lead").length, 1);
    assert.equal(
      filterParticipantsByRole(people, "General Sorter")[0]?.name,
      "Ada Lovelace",
    );
  });

  it("paginates and builds initials", () => {
    const page = paginateList(people, 1, 1);
    assert.equal(page.pageItems.length, 1);
    assert.equal(page.pageCount, 2);
    assert.equal(volunteerInitials("Ada Lovelace"), "AL");
  });
});

describe("roster grouped sections", () => {
  const assignment = (
    partial: Partial<VolunteerAssignmentView> &
      Pick<VolunteerAssignmentView, "externalKey" | "name">,
  ): VolunteerAssignmentView => ({
    externalKey: partial.externalKey,
    name: partial.name,
    groupName: partial.groupName,
    quantityRequested: partial.quantityRequested ?? 4,
    quantityFilled: partial.quantityFilled ?? 1,
    quantityOpen: partial.quantityOpen ?? 3,
    availabilityStatus: partial.availabilityStatus ?? "needs_help",
    sourceOrder: partial.sourceOrder ?? 0,
  });

  const person = (
    partial: Partial<VolunteerParticipantView> &
      Pick<
        VolunteerParticipantView,
        "participantKey" | "assignmentExternalKey" | "name" | "roleName"
      >,
  ): VolunteerParticipantView => ({
    participantKey: partial.participantKey,
    assignmentExternalKey: partial.assignmentExternalKey,
    name: partial.name,
    roleName: partial.roleName,
    status: "confirmed",
    sourceOrder: partial.sourceOrder ?? 0,
  });

  it("uses a single Roles section when groupName is absent", () => {
    const sections = buildVolunteerRosterSections(
      [assignment({ externalKey: "1", name: "Setup" })],
      [
        person({
          participantKey: "p1",
          assignmentExternalKey: "1",
          name: "Ada",
          roleName: "Setup",
        }),
      ],
    );
    assert.equal(sections.length, 1);
    assert.equal(sections[0]?.title, "Roles");
    assert.equal(sections[0]?.roles[0]?.people[0]?.name, "Ada");
    assert.equal(sections[0]?.roles[0]?.openSlots, 3);
    assert.equal(sections[0]?.filledSpots, 1);
    assert.equal(sections[0]?.totalSpots, 4);
  });

  it("groups by assignment groupName when present", () => {
    const sections = buildVolunteerRosterSections(
      [
        assignment({
          externalKey: "1",
          name: "Lead Sorters",
          groupName: "Sorting Team",
          quantityFilled: 4,
          quantityRequested: 4,
          quantityOpen: 0,
          availabilityStatus: "full",
        }),
        assignment({
          externalKey: "2",
          name: "Check-in",
          groupName: "Operations",
          quantityFilled: 0,
          quantityRequested: 4,
          quantityOpen: 4,
          availabilityStatus: "high_need",
        }),
      ],
      [],
    );
    assert.equal(sections.length, 2);
    assert.deepEqual(
      sections.map((s) => s.title).sort(),
      ["Operations", "Sorting Team"],
    );
    const sorting = sections.find((s) => s.title === "Sorting Team");
    assert.equal(sorting?.filledSpots, 4);
    assert.equal(sorting?.totalSpots, 4);
    assert.equal(sorting?.badge, "on_track");
  });

  it("maps fill percent to accordion progress tones", () => {
    assert.equal(rosterProgressTone(null), "muted");
    assert.equal(rosterProgressTone(0), "rose");
    assert.equal(rosterProgressTone(50), "gold");
    assert.equal(rosterProgressTone(80), "emerald");
    assert.equal(rosterProgressTone(100), "emerald");
  });
});
