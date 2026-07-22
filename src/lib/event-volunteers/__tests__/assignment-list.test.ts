import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterAndSortAssignments,
  formatAssignmentDateLabel,
  listAssignmentDateOptions,
  NO_DATE_FILTER,
} from "@/lib/event-volunteers/assignment-list";
import type { VolunteerAssignmentView } from "@/lib/event-volunteers/types";

function assignment(
  overrides: Partial<VolunteerAssignmentView> &
    Pick<VolunteerAssignmentView, "externalKey" | "name">,
): VolunteerAssignmentView {
  return {
    quantityRequested: 4,
    quantityFilled: 0,
    quantityOpen: 4,
    availabilityStatus: "high_need",
    sourceOrder: 0,
    ...overrides,
  };
}

describe("assignment date filter helpers", () => {
  it("formats date labels like the assignments table", () => {
    assert.equal(formatAssignmentDateLabel("2026-09-09"), "Wed, Sep 9");
    assert.equal(formatAssignmentDateLabel("2026-09-17"), "Thu, Sep 17");
  });

  it("lists distinct dates sorted ascending with No date when needed", () => {
    const options = listAssignmentDateOptions([
      assignment({
        externalKey: "1",
        name: "Later",
        date: "2026-09-17",
      }),
      assignment({
        externalKey: "2",
        name: "Earlier",
        date: "2026-09-09",
      }),
      assignment({
        externalKey: "3",
        name: "Earlier again",
        date: "2026-09-09",
      }),
      assignment({
        externalKey: "4",
        name: "Undated",
      }),
    ]);

    assert.deepEqual(options, [
      { value: "2026-09-09", label: "Wed, Sep 9" },
      { value: "2026-09-17", label: "Thu, Sep 17" },
      { value: NO_DATE_FILTER, label: "No date" },
    ]);
  });

  it("filters by date and combines with status filter + sort", () => {
    const rows = filterAndSortAssignments(
      [
        assignment({
          externalKey: "a",
          name: "Setup A",
          date: "2026-09-09",
          quantityOpen: 2,
          availabilityStatus: "high_need",
        }),
        assignment({
          externalKey: "b",
          name: "Setup B",
          date: "2026-09-09",
          quantityOpen: 5,
          availabilityStatus: "high_need",
        }),
        assignment({
          externalKey: "c",
          name: "Other day",
          date: "2026-09-17",
          quantityOpen: 9,
          availabilityStatus: "high_need",
        }),
        assignment({
          externalKey: "d",
          name: "Full same day",
          date: "2026-09-09",
          quantityOpen: 0,
          quantityFilled: 4,
          availabilityStatus: "full",
        }),
      ],
      {
        filter: "needs_help",
        dateFilter: "2026-09-09",
        sort: "most_needed",
      },
    );

    assert.deepEqual(
      rows.map((r) => r.externalKey),
      ["b", "a"],
    );
  });

  it("keeps undated rows only under No date (or All)", () => {
    const undated = assignment({
      externalKey: "u",
      name: "No date shift",
    });
    const dated = assignment({
      externalKey: "d",
      name: "Dated",
      date: "2026-09-09",
    });

    assert.deepEqual(
      filterAndSortAssignments([undated, dated], {
        filter: "all",
        dateFilter: NO_DATE_FILTER,
        sort: "name",
      }).map((r) => r.externalKey),
      ["u"],
    );

    assert.equal(
      filterAndSortAssignments([undated, dated], {
        filter: "all",
        dateFilter: "all",
        sort: "name",
      }).length,
      2,
    );
  });
});
