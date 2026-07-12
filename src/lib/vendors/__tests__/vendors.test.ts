import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { VendorDirectoryRow, VendorEventSummary } from "../../types/vendors.ts";
import {
  createDefaultVendorFilters,
  filterVendorDirectoryRows,
  pickLatestAssignment,
  vendorInitials,
} from "../filters.ts";
import {
  findVendorDuplicates,
  formatDuplicateWarning,
} from "../dedup.ts";

function makeRow(overrides: Partial<VendorDirectoryRow> & { vendor: VendorDirectoryRow["vendor"] }): VendorDirectoryRow {
  return {
    category: null,
    primaryContact: null,
    latestAssignment: null,
    assignmentCount: 0,
    eventIds: [],
    ...overrides,
  };
}

describe("vendor filters", () => {
  it("filters by search query", () => {
    const rows = [
      makeRow({
        vendor: {
          id: "1",
          organizationId: "org",
          name: "Sweet Bites Bakery",
          website: null,
          email: null,
          phone: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          postalCode: null,
          categoryId: null,
          status: "active",
          isFavorite: false,
          notesSummary: null,
          deletedAt: null,
          createdAt: "",
          updatedAt: "",
        },
      }),
      makeRow({
        vendor: {
          id: "2",
          organizationId: "org",
          name: "Party Rentals Co",
          website: null,
          email: null,
          phone: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          postalCode: null,
          categoryId: null,
          status: "active",
          isFavorite: false,
          notesSummary: null,
          deletedAt: null,
          createdAt: "",
          updatedAt: "",
        },
      }),
    ];

    const filtered = filterVendorDirectoryRows(
      rows,
      createDefaultVendorFilters({ search: "sweet" }),
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.vendor.name, "Sweet Bites Bakery");
  });

  it("picks the nearest upcoming assignment", () => {
    const assignments: VendorEventSummary[] = [
      {
        assignmentId: "a1",
        eventId: "e1",
        eventTitle: "Past",
        eventDate: "2020-01-01",
        assignmentStatus: "completed",
      },
      {
        assignmentId: "a2",
        eventId: "e2",
        eventTitle: "Soon",
        eventDate: "2099-06-01",
        assignmentStatus: "confirmed",
      },
      {
        assignmentId: "a3",
        eventId: "e3",
        eventTitle: "Later",
        eventDate: "2099-12-01",
        assignmentStatus: "pending",
      },
    ];

    const latest = pickLatestAssignment(assignments);
    assert.equal(latest?.eventTitle, "Soon");
  });

  it("builds vendor initials", () => {
    assert.equal(vendorInitials("Sweet Bites Bakery"), "SB");
    assert.equal(vendorInitials("Acme"), "AC");
  });
});

describe("vendor dedup", () => {
  it("detects duplicate vendor names", () => {
    const matches = findVendorDuplicates(
      [
        {
          id: "v1",
          organizationId: "org",
          name: "Sweet Bites Bakery",
          website: null,
          email: null,
          phone: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          postalCode: null,
          categoryId: null,
          status: "active",
          isFavorite: false,
          notesSummary: null,
          deletedAt: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
      { name: "sweet bites bakery" },
    );

    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.field, "name");
    assert.match(formatDuplicateWarning(matches), /Sweet Bites Bakery/);
  });
});
