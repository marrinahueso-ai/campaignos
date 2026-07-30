import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coalesceSemesterCalendarSlots,
  formatSemesterMonthListHtml,
  splitCalendarLines,
} from "@/lib/flyer-composer/semester-calendar";

describe("flyer composer semester calendar", () => {
  it("coalesces calendar lines from bodyCopy when datesEvents is empty", () => {
    const result = coalesceSemesterCalendarSlots("semester", {
      datesEvents: "",
      bodyCopy:
        "Aug 15 — Back to School Night\nSep 12 — Fall Festival\nFunds support classroom grants.",
    });

    assert.deepEqual(splitCalendarLines(result.datesEvents ?? ""), [
      "Aug 15 — Back to School Night",
      "Sep 12 — Fall Festival",
    ]);
    assert.equal(result.bodyCopy, "Funds support classroom grants.");
  });

  it("leaves non-semester templates unchanged", () => {
    const slots = {
      datesEvents: "",
      bodyCopy: "Aug 15 — Back to School Night",
    };
    assert.deepEqual(
      coalesceSemesterCalendarSlots("investor", slots),
      slots,
    );
  });

  it("renders month-list HTML when datesEvents is set", () => {
    const html = formatSemesterMonthListHtml(
      "Jan 10 — Science Fair\nFeb 14 — Valentine Party",
    );

    assert.match(html, /<span class="m">Jan 10<\/span>/);
    assert.match(html, /Science Fair/);
    assert.match(html, /<span class="m">Feb 14<\/span>/);
    assert.match(html, /Valentine Party/);
    assert.doesNotMatch(html, /Add dates in Inspiration/);
  });

  it("shows placeholder row when datesEvents is empty", () => {
    const html = formatSemesterMonthListHtml("");
    assert.match(html, /Add dates in Inspiration/);
  });
});
