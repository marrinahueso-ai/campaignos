import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEventsListPdfFilename,
  eventStatusLabel,
} from "../export-events-list-pdf.ts";

describe("export-events-list-pdf helpers", () => {
  it("builds a next-month filename with today's date", () => {
    assert.equal(
      buildEventsListPdfFilename({
        monthFilter: "next_month",
        today: "2026-07-23",
      }),
      "events-next-month-2026-07-23.pdf",
    );
  });

  it("maps status labels for the PDF", () => {
    assert.equal(eventStatusLabel("scheduled"), "Scheduled");
    assert.equal(eventStatusLabel("draft"), "Draft");
  });
});
