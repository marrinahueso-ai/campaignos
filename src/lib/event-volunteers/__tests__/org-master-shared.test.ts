import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVolunteersMasterKpis,
  calendarWeekRange,
  computeEventFillStats,
  filterVolunteersMasterEvents,
  listUnderfilledRoles,
  pickTopRoles,
  type VolunteersMasterEventRow,
} from "@/lib/event-volunteers/org-master-shared";
import type { VolunteerAssignmentView } from "@/lib/event-volunteers/types";

function assignment(
  partial: Partial<VolunteerAssignmentView> & { name: string },
): VolunteerAssignmentView {
  return {
    externalKey: partial.externalKey ?? partial.name,
    name: partial.name,
    quantityRequested: partial.quantityRequested ?? null,
    quantityFilled: partial.quantityFilled ?? null,
    quantityOpen: partial.quantityOpen ?? null,
    availabilityStatus: partial.availabilityStatus ?? "unknown",
    sourceOrder: partial.sourceOrder ?? 0,
    ...partial,
  };
}

function eventRow(
  partial: Partial<VolunteersMasterEventRow> & { id: string; title: string },
): VolunteersMasterEventRow {
  return {
    id: partial.id,
    title: partial.title,
    date: partial.date ?? "2026-07-25",
    eventType: partial.eventType ?? null,
    category: partial.category ?? null,
    fillRatePercent: partial.fillRatePercent ?? null,
    filledSpots: partial.filledSpots ?? null,
    totalSpots: partial.totalSpots ?? null,
    openSpots: partial.openSpots ?? null,
    underfilledRoleCount: partial.underfilledRoleCount ?? 0,
    topRoles: partial.topRoles ?? [],
    roleNames: partial.roleNames ?? [],
    signupUrl: partial.signupUrl ?? null,
    hasSnapshot: partial.hasSnapshot ?? false,
    isUpcoming60: partial.isUpcoming60 ?? true,
    needsPeople: partial.needsPeople ?? false,
    isCovered: partial.isCovered ?? false,
  };
}

describe("volunteers master shared helpers", () => {
  it("picks top roles by filled count", () => {
    const top = pickTopRoles([
      assignment({ name: "Gate", quantityFilled: 14, quantityRequested: 20, quantityOpen: 6, availabilityStatus: "needs_help" }),
      assignment({ name: "Check-in", quantityFilled: 18, quantityRequested: 20, quantityOpen: 2, availabilityStatus: "nearly_full" }),
      assignment({ name: "Course Marshal", quantityFilled: 16, quantityRequested: 20, quantityOpen: 4, availabilityStatus: "needs_help" }),
      assignment({ name: "Tech", quantityFilled: 4, quantityRequested: 8, quantityOpen: 4, availabilityStatus: "needs_help" }),
    ]);
    assert.deepEqual(
      top.map((row) => row.name),
      ["Check-in", "Course Marshal", "Gate"],
    );
  });

  it("lists underfilled roles by open spots", () => {
    const underfilled = listUnderfilledRoles([
      assignment({ name: "Full", quantityFilled: 5, quantityRequested: 5, quantityOpen: 0, availabilityStatus: "full" }),
      assignment({ name: "Marshal", quantityFilled: 1, quantityRequested: 6, quantityOpen: 5, availabilityStatus: "high_need" }),
      assignment({ name: "Gate", quantityFilled: 2, quantityRequested: 4, quantityOpen: 2, availabilityStatus: "needs_help" }),
    ]);
    assert.equal(underfilled.length, 2);
    assert.equal(underfilled[0]?.roleName, "Marshal");
    assert.equal(underfilled[0]?.openSpots, 5);
  });

  it("computes fill rate from complete quantities", () => {
    const stats = computeEventFillStats([
      assignment({ name: "A", quantityRequested: 10, quantityFilled: 8, quantityOpen: 2, availabilityStatus: "needs_help" }),
      assignment({ name: "B", quantityRequested: 10, quantityFilled: 6, quantityOpen: 4, availabilityStatus: "needs_help" }),
    ]);
    assert.equal(stats.fillRatePercent, 70);
    assert.equal(stats.filledSpots, 14);
    assert.equal(stats.totalSpots, 20);
  });

  it("aggregates KPIs across events", () => {
    const kpis = buildVolunteersMasterKpis([
      eventRow({
        id: "1",
        title: "A",
        filledSpots: 70,
        totalSpots: 100,
        underfilledRoleCount: 2,
        isUpcoming60: true,
        needsPeople: true,
      }),
      eventRow({
        id: "2",
        title: "B",
        filledSpots: 30,
        totalSpots: 50,
        underfilledRoleCount: 0,
        isUpcoming60: false,
        isCovered: true,
      }),
    ]);
    assert.equal(kpis.totalVolunteers, 100);
    assert.equal(kpis.overallFillRatePercent, 67);
    assert.equal(kpis.underfilledRoleCount, 2);
    assert.equal(kpis.underfilledEventCount, 1);
    assert.equal(kpis.upcomingEventCount, 1);
  });

  it("filters by search and chip", () => {
    const events = [
      eventRow({
        id: "1",
        title: "Ozark Forest Ralli",
        roleNames: ["Check-in", "Gate"],
        isUpcoming60: true,
        needsPeople: true,
      }),
      eventRow({
        id: "2",
        title: "High Country Ralli",
        roleNames: ["Course Marshal"],
        isUpcoming60: true,
        needsPeople: false,
        isCovered: true,
      }),
      eventRow({
        id: "3",
        title: "Past Picnic",
        roleNames: ["Setup"],
        isUpcoming60: false,
        needsPeople: true,
      }),
    ];

    const byRole = filterVolunteersMasterEvents(events, {
      filter: "all",
      search: "marshal",
    });
    assert.equal(byRole.length, 1);
    assert.equal(byRole[0]?.id, "2");

    const needsPeople = filterVolunteersMasterEvents(events, {
      filter: "needs_people",
      search: "",
    });
    assert.deepEqual(
      needsPeople.map((row) => row.id),
      ["1", "3"],
    );

    const upcoming = filterVolunteersMasterEvents(events, {
      filter: "upcoming",
      search: "ozark",
    });
    assert.equal(upcoming.length, 1);
    assert.equal(upcoming[0]?.id, "1");
  });

  it("computes Sunday-start calendar week", () => {
    // Thursday Jul 23, 2026 → week Sun Jul 19 – Sat Jul 25
    const week = calendarWeekRange("2026-07-23");
    assert.equal(week.start, "2026-07-19");
    assert.equal(week.end, "2026-07-25");
  });
});
