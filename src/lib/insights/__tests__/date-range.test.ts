import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daysBetweenInclusive,
  formatDateRangeLabel,
  getDefaultDateRange,
  getPreviousPeriod,
  resolveInsightsDateRange,
} from "../date-range.ts";

test("resolveInsightsDateRange uses preset ranges", () => {
  const range = resolveInsightsDateRange({ range: "7d" });
  assert.equal(daysBetweenInclusive(range.from, range.to), 7);
});

test("resolveInsightsDateRange honors explicit from/to", () => {
  const range = resolveInsightsDateRange({
    from: "2026-07-01",
    to: "2026-07-08",
  });

  assert.equal(range.from, "2026-07-01");
  assert.equal(range.to, "2026-07-08");
  assert.match(range.label, /Jul/);
});

test("getPreviousPeriod returns equal-length prior window", () => {
  const previous = getPreviousPeriod("2026-07-08", "2026-07-14");
  assert.equal(daysBetweenInclusive(previous.from, previous.to), 7);
  assert.equal(previous.to, "2026-07-07");
});

test("getDefaultDateRange returns a 7-day window", () => {
  const reference = new Date("2026-07-11T12:00:00.000Z");
  const range = getDefaultDateRange(reference);
  assert.equal(daysBetweenInclusive(range.from, range.to), 7);
  assert.equal(formatDateRangeLabel(range.from, range.to), range.label);
});
