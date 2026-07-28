import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultFooter,
  defaultHeader,
  defaultCardsSectionTitle,
  normalizeComposerState,
} from "@/lib/homepage-composer/defaults";
import {
  exportHomepageHtml,
  formatCardVisibilityMemo,
  formatVisibilityShortDate,
} from "@/lib/homepage-composer/export-html";
import type { HomepageCard, HomepageComposerState } from "@/lib/homepage-composer/types";

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
    assert.equal(normalized.cardsSectionTitle, defaultCardsSectionTitle());
  });

  it("migrates missing cardsSectionTitle on old drafts", () => {
    const raw = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      resources: [],
      selectedEventIds: [],
      cards: [],
    };
    const normalized = normalizeComposerState(raw, "Test");
    assert.ok(normalized);
    assert.equal(normalized.cardsSectionTitle, defaultCardsSectionTitle());
  });

  it("exports editable cards section title", () => {
    const state: HomepageComposerState = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      cardsSectionTitle: "Fall Family Events",
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
          linkUrl: "",
          linkLabel: "",
          date: null,
          time: null,
          startsOn: null,
          expiresOn: null,
          alwaysOn: true,
        },
      ],
    };

    const html = exportHomepageHtml(state);
    assert.match(html, /Fall Family Events/);
    assert.doesNotMatch(html, /Back-to-School Essentials/);
  });

  it("exports editable linkLabel and card date", () => {
    const state: HomepageComposerState = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      cardsSectionTitle: defaultCardsSectionTitle(),
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
    assert.match(html, /ees-card-meta/);
    assert.match(html, /ees-card-meta-date/);
    assert.match(html, /ees-card-meta-link/);
    assert.match(html, /ees-when/);
    assert.doesNotMatch(html, /ees-visibility-memo/);
  });

  it("renders date-only cards in the meta date slot above an empty link slot", () => {
    const state: HomepageComposerState = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      cardsSectionTitle: defaultCardsSectionTitle(),
      resources: [],
      selectedEventIds: [],
      cards: [
        {
          id: "c-date-only",
          source: "event",
          eventId: "evt-1",
          title: "Picture Day",
          blurb: "Smiles required.",
          imageUrl: null,
          linkUrl: "",
          linkLabel: "",
          date: "2026-09-12",
          time: "09:30:00",
          startsOn: null,
          expiresOn: null,
          alwaysOn: true,
        },
      ],
    };

    const html = exportHomepageHtml(state);
    assert.match(html, /Sep 12 · 9:30 AM/);
    assert.match(
      html,
      /ees-card-meta-date[\s\S]*ees-when[\s\S]*ees-card-meta-link/,
    );
    assert.doesNotMatch(html, /ees-card-note/);
  });

  it("formats visibility memos for download preview only", () => {
    assert.equal(formatVisibilityShortDate("2026-08-10"), "8/10/26");
    assert.equal(formatVisibilityShortDate("2026-12-05"), "12/5/26");

    const windowed: HomepageCard = {
      id: "c2",
      source: "custom",
      eventId: null,
      title: "Spirit Week",
      blurb: "Dress up days.",
      imageUrl: null,
      linkUrl: "",
      linkLabel: "",
      date: null,
      time: null,
      startsOn: "2026-08-10",
      expiresOn: "2026-08-15",
      alwaysOn: false,
    };
    assert.equal(
      formatCardVisibilityMemo(windowed),
      "on: 8/10/26 · off: 8/15/26",
    );
    assert.equal(
      formatCardVisibilityMemo({ ...windowed, expiresOn: null }),
      "on: 8/10/26 · always on",
    );
    assert.equal(
      formatCardVisibilityMemo({
        ...windowed,
        alwaysOn: true,
        startsOn: null,
        expiresOn: null,
      }),
      "Always on",
    );

    const state: HomepageComposerState = {
      header: defaultHeader("Test"),
      footer: defaultFooter(),
      cardsSectionTitle: defaultCardsSectionTitle(),
      resources: [],
      selectedEventIds: [],
      cards: [windowed],
    };
    const plain = exportHomepageHtml(state, { showAllCards: true });
    assert.doesNotMatch(plain, /ees-visibility-memo/);
    const download = exportHomepageHtml(state, {
      showAllCards: true,
      includeVisibilityMemos: true,
    });
    assert.match(download, /ees-visibility-memo/);
    assert.match(download, /on: 8\/10\/26 · off: 8\/15\/26/);
  });
});
