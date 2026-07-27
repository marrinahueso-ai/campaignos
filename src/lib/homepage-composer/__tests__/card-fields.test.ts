import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultFooter,
  defaultHeader,
  normalizeComposerState,
} from "@/lib/homepage-composer/defaults";
import { exportHomepageHtml } from "@/lib/homepage-composer/export-html";
import type { HomepageComposerState } from "@/lib/homepage-composer/types";

describe("homepage composer card linkLabel + date", () => {
  it("migrates missing linkLabel and date on old drafts", () => {
    const raw = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      resources: [],
      selectedEventIds: [],
      cards: [
        {
          id: "legacy-1",
          source: "custom",
          eventId: null,
          title: "Old card",
          blurb: "Hello",
          imageUrl: null,
          linkUrl: "https://example.com/info",
          // no linkLabel
          // no date
          alwaysOn: true,
        },
        {
          id: "legacy-2",
          source: "event",
          eventId: "evt-1",
          title: "Fair",
          blurb: "Join",
          imageUrl: null,
          linkUrl: "",
          date: "2026-08-08",
          alwaysOn: false,
          expiresOn: "2026-08-08",
        },
      ],
    };

    const normalized = normalizeComposerState(raw, "Test");
    assert.ok(normalized);
    assert.equal(normalized.cards[0]?.linkLabel, "Learn More →");
    assert.equal(normalized.cards[0]?.date, null);
    assert.equal(normalized.cards[1]?.linkLabel, "");
    assert.equal(normalized.cards[1]?.date, "2026-08-08");
  });

  it("exports editable linkLabel and card date", () => {
    const state: HomepageComposerState = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      resources: [],
      selectedEventIds: [],
      cards: [
        {
          id: "c1",
          source: "custom",
          eventId: null,
          title: "Open House",
          blurb: "Tour classrooms.",
          imageUrl: null,
          linkUrl: "https://example.com/open-house",
          linkLabel: "Details →",
          date: "2026-08-08",
          time: null,
          startsOn: null,
          expiresOn: null,
          alwaysOn: true,
        },
      ],
    };

    const html = exportHomepageHtml(state);
    assert.match(html, /Details →/);
    assert.match(html, /Aug 8/);
    assert.match(html, /ees-when/);
  });
});
