import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultFooter,
  defaultHeader,
  normalizeComposerState,
} from "@/lib/homepage-composer/defaults";
import {
  copyMonthCardsFrom,
  currentMonthYyyyMm,
  saveWorkingMonth,
  shiftMonth,
  switchWorkingMonth,
  workingMonthStatus,
} from "@/lib/homepage-composer/month-drafts";
import type {
  HomepageCard,
  HomepageComposerState,
} from "@/lib/homepage-composer/types";

function sampleCard(id: string, title: string): HomepageCard {
  return {
    id,
    source: "custom",
    eventId: null,
    title,
    blurb: "Hello",
    imageUrl: null,
    linkUrl: "",
    linkLabel: "",
    date: null,
    time: null,
    startsOn: null,
    expiresOn: null,
    alwaysOn: true,
  };
}

function baseState(month = "2026-08"): HomepageComposerState {
  const cards = [sampleCard("c1", "August Fair")];
  const header = defaultHeader("Test");
  const announcements = header.announcements.map((row) => ({ ...row }));
  return {
    header,
    footer: defaultFooter(),
    cardsSectionTitle: "What’s Happening",
    resources: [],
    workingMonth: month,
    selectedEventIds: ["evt-1"],
    cards,
    monthDrafts: {
      [month]: { cards, selectedEventIds: ["evt-1"], announcements },
    },
    monthSaved: {},
  };
}

describe("homepage composer month drafts", () => {
  it("shifts YYYY-MM by delta", () => {
    assert.equal(shiftMonth("2026-08", 1), "2026-09");
    assert.equal(shiftMonth("2026-01", -1), "2025-12");
  });

  it("switches month and keeps prior draft in monthDrafts", () => {
    const august = baseState("2026-08");
    const september = switchWorkingMonth(august, "2026-09");
    assert.equal(september.workingMonth, "2026-09");
    assert.equal(september.cards.length, 0);
    assert.equal(september.header.announcements.length, 0);
    assert.equal(september.monthDrafts["2026-08"]?.cards[0]?.title, "August Fair");
    assert.equal(
      september.monthDrafts["2026-08"]?.announcements[0]?.text,
      "Important Date: August 10: Season Kickoff",
    );
    assert.equal(september.monthDrafts["2026-09"]?.cards.length, 0);
  });

  it("switches announcement bar with working month", () => {
    const august = baseState("2026-08");
    const savedAug = saveWorkingMonth(august);
    const september = switchWorkingMonth(savedAug, "2026-09");
    const withSepAnns: HomepageComposerState = {
      ...september,
      header: {
        ...september.header,
        announcements: [
          {
            id: "ann-sep",
            emoji: "📣",
            text: "September open house",
            startsOn: null,
            expiresOn: null,
            alwaysOn: true,
          },
        ],
      },
    };
    const savedSep = saveWorkingMonth(withSepAnns);
    const back = switchWorkingMonth(savedSep, "2026-08");
    assert.equal(
      back.header.announcements[0]?.text,
      "Important Date: August 10: Season Kickoff",
    );
    const again = switchWorkingMonth(back, "2026-09");
    assert.equal(again.header.announcements[0]?.text, "September open house");
  });

  it("save this month commits snapshot for copy-from", () => {
    const saved = saveWorkingMonth(baseState("2026-08"));
    assert.equal(workingMonthStatus(saved), "saved");
    assert.equal(saved.monthSaved["2026-08"]?.cards[0]?.title, "August Fair");

    const emptySep = switchWorkingMonth(saved, "2026-09");
    assert.equal(workingMonthStatus(emptySep), "empty");

    const copied = copyMonthCardsFrom(emptySep, "2026-08");
    assert.ok(copied);
    assert.equal(copied.workingMonth, "2026-09");
    assert.equal(copied.cards[0]?.title, "August Fair");
    assert.equal(workingMonthStatus(copied), "unsaved");
  });

  it("copy-from ignores unsaved-only months", () => {
    const state = baseState("2026-08");
    assert.equal(copyMonthCardsFrom(state, "2026-08"), null);
  });

  it("migrates legacy drafts into current month saved snapshot", () => {
    const raw = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      resources: [],
      selectedEventIds: ["evt-1"],
      cards: [sampleCard("legacy", "Legacy card")],
    };
    const normalized = normalizeComposerState(raw, "Test");
    assert.ok(normalized);
    assert.equal(normalized.workingMonth, currentMonthYyyyMm());
    assert.equal(
      normalized.monthSaved[normalized.workingMonth]?.cards[0]?.title,
      "Legacy card",
    );
    assert.equal(
      normalized.monthSaved[normalized.workingMonth]?.announcements.length,
      defaultHeader("Test").announcements.length,
    );
    assert.equal(workingMonthStatus(normalized), "saved");
  });

  it("migrates header-only announcements into working month snapshot", () => {
    const header = defaultHeader("Test");
    const cards = [sampleCard("c1", "August Fair")];
    const raw = {
      header,
      footer: defaultFooter(),
      cardsSectionTitle: "What’s Happening",
      resources: [],
      workingMonth: "2026-08",
      selectedEventIds: ["evt-1"],
      cards,
      monthDrafts: {
        "2026-08": { cards, selectedEventIds: ["evt-1"] },
      },
      monthSaved: {},
    };
    const normalized = normalizeComposerState(raw, "Test");
    assert.ok(normalized);
    assert.equal(
      normalized.monthDrafts["2026-08"]?.announcements[0]?.text,
      header.announcements[0]?.text,
    );
    assert.equal(
      normalized.header.announcements[0]?.text,
      header.announcements[0]?.text,
    );
  });
});
