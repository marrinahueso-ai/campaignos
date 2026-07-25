import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterFilesToOrgEventIds,
  resolveFilesOrgQueryScope,
} from "../org-scope.ts";

describe("resolveFilesOrgQueryScope", () => {
  it("scopes the global library to active-org event ids", () => {
    const scope = resolveFilesOrgQueryScope({
      orgEventIds: ["school-b-1", "school-b-2"],
    });
    assert.equal(scope.kind, "all");
    if (scope.kind === "all") {
      assert.deepEqual(scope.eventIds, ["school-b-1", "school-b-2"]);
    }
  });

  it("rejects an event id from another organization", () => {
    const scope = resolveFilesOrgQueryScope({
      orgEventIds: ["school-b-1"],
      requestedEventId: "edmondson-event",
    });
    assert.equal(scope.kind, "none");
  });

  it("allows an event id that belongs to the active org", () => {
    const scope = resolveFilesOrgQueryScope({
      orgEventIds: ["school-b-1", "school-b-2"],
      requestedEventId: "school-b-2",
    });
    assert.equal(scope.kind, "one");
    if (scope.kind === "one") {
      assert.equal(scope.eventId, "school-b-2");
    }
  });

  it("returns none when the org has no events", () => {
    assert.equal(resolveFilesOrgQueryScope({ orgEventIds: [] }).kind, "none");
  });
});

describe("filterFilesToOrgEventIds", () => {
  it("drops Edmondson files when School B is active", () => {
    const files = [
      { id: "1", eventId: "ees-1", name: "Edmondson_PTO_Google_Calendar_Import.xlsx" },
      { id: "2", eventId: "school-b-1", name: "school-b-notes.docx" },
      { id: "3", eventId: "ees-2", name: "EES PTO Board Meeting Minutes July 2026.docx" },
    ];
    const scoped = filterFilesToOrgEventIds(files, ["school-b-1"]);
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0]?.name, "school-b-notes.docx");
  });
});
