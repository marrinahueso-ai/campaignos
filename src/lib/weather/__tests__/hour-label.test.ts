import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatHourLabel } from "../mock.ts";

describe("weather hour labels", () => {
  it("uses the organization timezone instead of the server clock", () => {
    const utcEvening = new Date("2026-08-22T02:00:00.000Z");
    assert.equal(formatHourLabel(utcEvening, "America/Chicago"), "9pm");
    assert.equal(formatHourLabel(utcEvening, "UTC"), "2am");
  });
});
