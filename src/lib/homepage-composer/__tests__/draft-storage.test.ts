import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultFooter,
  defaultHeader,
} from "@/lib/homepage-composer/defaults";
import type { HomepageComposerState } from "@/lib/homepage-composer/types";
import { parseComposerDraftRaw } from "@/lib/homepage-composer/draft-storage";

function sampleState(): HomepageComposerState {
  const cards: HomepageComposerState["cards"] = [
    {
      id: "event-evt-1",
      source: "event",
      eventId: "evt-1",
      title: "Spring Fair",
      blurb: "Join us!",
      imageUrl: "https://cdn.example/art.jpg",
      linkUrl: "https://example.com/volunteer",
      linkLabel: "Volunteer →",
      date: "2026-04-10",
      time: "10:00 AM",
      startsOn: "2026-03-01",
      expiresOn: "2026-04-10",
      alwaysOn: false,
    },
  ];
  const workingMonth = "2026-04";
  const header = defaultHeader("Test School");
  const snapshot = {
    cards,
    selectedEventIds: ["evt-1"],
    announcements: header.announcements.map((row) => ({ ...row })),
  };
  return {
    header,
    footer: defaultFooter(),
    cardsSectionTitle: "Back-to-School Essentials",
    resources: [],
    workingMonth,
    selectedEventIds: ["evt-1"],
    cards,
    monthDrafts: { [workingMonth]: snapshot },
    monthSaved: { [workingMonth]: snapshot },
  };
}

describe("homepage composer draft-storage parse", () => {
  it("parses v4 envelope", () => {
    const state = sampleState();
    const raw = JSON.stringify({ v: 4, at: 1_700_000_000_000, state });
    const parsed = parseComposerDraftRaw(raw);
    assert.ok(parsed);
    assert.equal(parsed.cards[0]?.title, "Spring Fair");
    assert.equal(parsed.cards[0]?.imageUrl, "https://cdn.example/art.jpg");
    assert.equal(parsed.header.title, state.header.title);
  });

  it("parses legacy raw state (no envelope)", () => {
    const state = sampleState();
    const parsed = parseComposerDraftRaw(JSON.stringify(state));
    assert.ok(parsed);
    assert.equal(parsed.cards[0]?.title, "Spring Fair");
    assert.equal(parsed.selectedEventIds[0], "evt-1");
  });

  it("returns null for garbage", () => {
    assert.equal(parseComposerDraftRaw("not-json"), null);
    assert.equal(parseComposerDraftRaw(JSON.stringify({ hello: 1 })), null);
  });
});
