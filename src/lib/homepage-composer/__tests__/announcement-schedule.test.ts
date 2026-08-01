import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeAnnouncement } from "../defaults.ts";
import { exportHomepageHtml } from "../export-html.ts";
import { isScheduleVisibleOn } from "../schedule-visibility.ts";
import { defaultFooter, defaultHeader } from "../defaults.ts";
import { currentMonthYyyyMm } from "../month-drafts.ts";
import type { HomepageComposerState } from "../types.ts";

describe("homepage announcement on/off dates", () => {
  it("migrates legacy announcement rows to always-on", () => {
    const ann = normalizeAnnouncement({
      id: "a1",
      emoji: "📅",
      text: "Kickoff",
    });
    assert.equal(ann.alwaysOn, true);
    assert.equal(ann.startsOn, null);
    assert.equal(ann.expiresOn, null);
  });

  it("hides scheduled announcements outside the window", () => {
    const ann = normalizeAnnouncement({
      text: "Tonight",
      startsOn: "2026-08-10",
      expiresOn: "2026-08-12",
      alwaysOn: false,
    });
    assert.equal(isScheduleVisibleOn(ann, "2026-08-09"), false);
    assert.equal(isScheduleVisibleOn(ann, "2026-08-10"), true);
    assert.equal(isScheduleVisibleOn(ann, "2026-08-12"), true);
    assert.equal(isScheduleVisibleOn(ann, "2026-08-13"), false);
  });

  it("exports data-starts / data-expires on announcement lines", () => {
    const workingMonth = currentMonthYyyyMm();
    const state: HomepageComposerState = {
      header: {
        ...defaultHeader("Test"),
        announcements: [
          normalizeAnnouncement({
            id: "ann-window",
            emoji: "📅",
            text: "Windowed line",
            startsOn: "2026-08-01",
            expiresOn: "2026-08-15",
            alwaysOn: false,
          }),
        ],
      },
      footer: defaultFooter(),
      cardsSectionTitle: "What’s Happening",
      resources: [],
      selectedEventIds: [],
      cards: [],
      workingMonth,
      monthDrafts: {
        [workingMonth]: {
          cards: [],
          selectedEventIds: [],
          announcements: [
            normalizeAnnouncement({
              id: "ann-window",
              emoji: "📅",
              text: "Windowed line",
              startsOn: "2026-08-01",
              expiresOn: "2026-08-15",
              alwaysOn: false,
            }),
          ],
        },
      },
      monthSaved: {},
    };

    const html = exportHomepageHtml(state);
    assert.match(html, /ees-announcement-line[^>]*data-starts="2026-08-01"/);
    assert.match(html, /ees-announcement-line[^>]*data-expires="2026-08-15"/);
    assert.match(html, /ees-announcement-line\[data-starts\]/);
  });
});
