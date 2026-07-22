import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterAndSortAssignments } from "@/lib/event-volunteers/assignment-list";
import {
  buildSnapshotFromAssignments,
  classifyAssignments,
  computeTotalsFromAssignments,
  resolveAvailabilityStatus,
  summarizeAssignmentList,
} from "@/lib/event-volunteers/stats";
import type { VolunteerAssignmentView } from "@/lib/event-volunteers/types";
import { normalizeSignUpGeniusPayload } from "@/lib/event-volunteers/signupgenius-normalize";
import { validateSignUpGeniusUrl } from "@/lib/event-volunteers/url";

describe("volunteer url validation", () => {
  it("accepts public SignUpGenius go links", () => {
    const result = validateSignUpGeniusUrl(
      "https://www.signupgenius.com/go/10C0D45ADAB2FA7FEC16-64779342-eesback",
    );
    assert.ok(!("error" in result));
    assert.equal(result.urlid, "10C0D45ADAB2FA7FEC16-64779342-eesback");
  });

  it("rejects unsupported hosts", () => {
    const result = validateSignUpGeniusUrl("https://example.com/go/abc");
    assert.ok("error" in result);
  });

  it("rejects non-https", () => {
    const result = validateSignUpGeniusUrl(
      "http://www.signupgenius.com/go/10C0D45ADAB2FA7FEC16-64779342-eesback",
    );
    assert.ok("error" in result);
  });
});

describe("volunteer stats", () => {
  it("calculates totals accurately", () => {
    const totals = computeTotalsFromAssignments([
      {
        externalKey: "1",
        name: "Setup",
        quantityRequested: 4,
        quantityFilled: 1,
        quantityOpen: 3,
      },
      {
        externalKey: "2",
        name: "Cleanup",
        quantityRequested: 4,
        quantityFilled: 0,
        quantityOpen: 4,
      },
    ]);
    assert.equal(totals.totalSpots, 8);
    assert.equal(totals.filledSpots, 1);
    assert.equal(totals.openSpots, 7);
    assert.equal(totals.quantitiesComplete, true);
  });

  it("marks totals unknown when quantities are incomplete", () => {
    const totals = computeTotalsFromAssignments([
      {
        externalKey: "1",
        name: "Mystery",
        quantityRequested: null,
        quantityFilled: null,
        quantityOpen: null,
      },
    ]);
    assert.equal(totals.totalSpots, null);
    assert.equal(totals.quantitiesComplete, false);
  });

  it("avoids division by zero for overall fill", () => {
    const { summary } = buildSnapshotFromAssignments({
      parseVersion: "1",
      assignments: [
        {
          externalKey: "1",
          name: "Zero capacity",
          quantityRequested: 0,
          quantityFilled: 0,
          quantityOpen: 0,
        },
      ],
    });
    assert.equal(summary.overallFilledPercent, null);
  });

  it("summarizes a filtered assignment list for summary cards", () => {
    const assignments: VolunteerAssignmentView[] = [
      {
        externalKey: "a",
        name: "Day 1 Setup",
        date: "2026-09-09",
        quantityRequested: 4,
        quantityFilled: 1,
        quantityOpen: 3,
        availabilityStatus: "high_need",
        sourceOrder: 0,
      },
      {
        externalKey: "b",
        name: "Day 1 Full",
        date: "2026-09-09",
        quantityRequested: 2,
        quantityFilled: 2,
        quantityOpen: 0,
        availabilityStatus: "full",
        sourceOrder: 1,
      },
      {
        externalKey: "c",
        name: "Day 2 Cleanup",
        date: "2026-09-17",
        quantityRequested: 10,
        quantityFilled: 0,
        quantityOpen: 10,
        availabilityStatus: "high_need",
        sourceOrder: 2,
      },
    ];

    const filtered = filterAndSortAssignments(assignments, {
      filter: "all",
      dateFilter: "2026-09-09",
      sort: "name",
    });
    const summary = summarizeAssignmentList(filtered);

    assert.equal(summary.assignmentCount, 2);
    assert.equal(summary.totalSpots, 6);
    assert.equal(summary.filledSpots, 3);
    assert.equal(summary.openSpots, 3);
    assert.equal(summary.overallFilledPercent, 50);
    assert.equal(summary.fullAssignmentCount, 1);
    assert.equal(summary.needsHelpCount, 1);
    assert.equal(summary.quantitiesComplete, true);
  });

  it("returns zeros for an empty filtered assignment list", () => {
    const summary = summarizeAssignmentList([]);
    assert.deepEqual(summary, {
      totalSpots: 0,
      filledSpots: 0,
      openSpots: 0,
      overallFilledPercent: 0,
      fullAssignmentCount: 0,
      needsHelpCount: 0,
      nearlyFullCount: 0,
      unknownAssignmentCount: 0,
      assignmentCount: 0,
      quantitiesComplete: true,
    });
  });

  it("marks high need for zero filled and largest open", () => {
    const classified = classifyAssignments([
      {
        externalKey: "a",
        name: "A",
        quantityRequested: 4,
        quantityFilled: 0,
        quantityOpen: 4,
      },
      {
        externalKey: "b",
        name: "B",
        quantityRequested: 4,
        quantityFilled: 0,
        quantityOpen: 4,
      },
      {
        externalKey: "c",
        name: "C",
        quantityRequested: 2,
        quantityFilled: 1,
        quantityOpen: 1,
      },
    ]);
    assert.equal(classified[0]?.availabilityStatus, "high_need");
    assert.equal(classified[1]?.availabilityStatus, "high_need");
    assert.equal(classified[2]?.availabilityStatus, "needs_help");
  });

  it("classifies nearly full and full", () => {
    assert.equal(
      resolveAvailabilityStatus({
        quantityRequested: 4,
        quantityFilled: 4,
        quantityOpen: 0,
        maxOpenAmongActive: 3,
      }),
      "full",
    );
    assert.equal(
      resolveAvailabilityStatus({
        quantityRequested: 4,
        quantityFilled: 3,
        quantityOpen: 1,
        maxOpenAmongActive: 3,
      }),
      "nearly_full",
    );
  });
});

describe("signupgenius normalize", () => {
  it("normalizes multiple assignments and strips participants", () => {
    const result = normalizeSignUpGeniusPayload(
      {
        participants: {
          "1816936636": [
            { firstname: "Secret", lastname: "Person", email: "x@y.com" },
          ],
        },
        slots: {
          "824807901": {
            starttime: "August, 05 2026 14:00:00",
            endtime: "August, 05 2026 17:00:00",
            location: "Edmondson Elementary School",
            items: [
              {
                item: "2-3pm EES fair set up",
                itemDescription: "",
                qty: 4,
                qtyTaken: 1,
                slotitemid: 1816936636,
                itemorder: 1,
              },
              {
                item: "4:30-5pm Break down",
                qty: 4,
                qtyTaken: "",
                slotitemid: 1816936919,
                itemorder: 2,
              },
            ],
          },
        },
      },
      {
        sourceTitle: "EES Back to School Fair",
        sourceUrl:
          "https://www.signupgenius.com/go/10C0D45ADAB2FA7FEC16-64779342-eesback",
      },
    );

    assert.ok(!("error" in result));
    assert.equal(result.sourceTitle, "EES Back to School Fair");
    assert.equal(result.assignments.length, 2);
    assert.equal(result.totals.totalSpots, 8);
    assert.equal(result.totals.filledSpots, 1);
    assert.equal(result.totals.openSpots, 7);
    assert.equal(result.assignments[0]?.name, "2-3pm EES fair set up");
    assert.equal(result.assignments[1]?.quantityFilled, 0);
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /Secret|Person|x@y\.com/);
  });

  it("returns empty_parse when no assignments", () => {
    const result = normalizeSignUpGeniusPayload(
      { slots: {} },
      {
        sourceUrl:
          "https://www.signupgenius.com/go/10C0D45ADAB2FA7FEC16-64779342-eesback",
      },
    );
    assert.ok("error" in result);
    assert.equal(result.error, "empty_parse");
  });
});
