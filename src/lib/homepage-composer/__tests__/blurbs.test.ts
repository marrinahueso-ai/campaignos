import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnnouncementTextFromEvent,
  formatEventWhen,
} from "@/lib/homepage-composer/blurbs";

describe("buildAnnouncementTextFromEvent", () => {
  it("combines title and formatted date/time", () => {
    assert.equal(
      buildAnnouncementTextFromEvent({
        title: "Spring Fair",
        date: "2026-03-15",
        time: "6:00 PM",
      }),
      "Spring Fair — Mar 15 · 6:00 PM",
    );
  });

  it("uses title only when date is missing", () => {
    assert.equal(
      buildAnnouncementTextFromEvent({
        title: "Volunteer drive",
        date: "",
        time: null,
      }),
      "Volunteer drive",
    );
  });
});

describe("formatEventWhen", () => {
  it("formats date without time", () => {
    assert.equal(formatEventWhen("2026-08-10", null), "Aug 10");
  });

  it("formats 24h time without seconds", () => {
    assert.equal(formatEventWhen("2026-08-04", "13:00:00"), "Aug 4 · 1:00 PM");
    assert.equal(formatEventWhen("2026-08-05", "16:00:00"), "Aug 5 · 4:00 PM");
  });

  it("preserves already-friendly 12h time", () => {
    assert.equal(formatEventWhen("2026-03-15", "6:00 PM"), "Mar 15 · 6:00 PM");
  });
});
