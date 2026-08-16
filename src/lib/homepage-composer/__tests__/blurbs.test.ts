import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnnouncementTextFromEvent,
  buildEventBlurb,
  formatEventWhen,
  inferHomepageCardAngle,
  isWeakInvitationSeed,
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

describe("inferHomepageCardAngle", () => {
  it("treats early release as informational", () => {
    assert.equal(inferHomepageCardAngle("Early Release"), "info");
  });

  it("treats spirit week as spirit", () => {
    assert.equal(
      inferHomepageCardAngle("Spirit Week - EES School Spirit - Monday"),
      "spirit",
    );
  });
});

describe("buildEventBlurb", () => {
  it("does not default to Join us for schedule notices", () => {
    const blurb = buildEventBlurb({
      title: "Early Release",
      description: "",
      date: "2026-09-16",
      time: null,
    });
    assert.match(blurb, /Early Release is Sep 16/);
    assert.doesNotMatch(blurb, /Join us/i);
  });

  it("varies spirit-day seed copy", () => {
    const blurb = buildEventBlurb({
      title: "Spirit Week - Monday",
      description: "",
      date: "2026-09-14",
      time: null,
    });
    assert.match(blurb, /Spirit Week/);
    assert.doesNotMatch(blurb, /Join us/i);
  });

  it("keeps a real event description as the seed", () => {
    const blurb = buildEventBlurb({
      title: "Early Release",
      description:
        "Please review your school dismissal pick-up plan so the afternoon goes smoothly.",
      date: "2026-09-16",
      time: null,
    });
    assert.match(blurb, /dismissal pick-up plan/);
  });
});

describe("isWeakInvitationSeed", () => {
  it("flags leftover Join us title restates", () => {
    assert.equal(
      isWeakInvitationSeed("Join us for Early Release — Sep 16.", "Early Release"),
      true,
    );
  });

  it("keeps invitation copy that still has useful facts", () => {
    assert.equal(
      isWeakInvitationSeed(
        "Join us for Early Release. Please review your school dismissal pick-up plan.",
        "Early Release",
      ),
      false,
    );
  });
});
