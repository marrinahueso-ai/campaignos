import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultFooter,
  defaultHeader,
  defaultCardsSectionTitle,
  normalizeComposerState,
} from "@/lib/homepage-composer/defaults";
import {
  buildHomepageHeroButtonsHtml,
  exportHomepageHtml,
} from "@/lib/homepage-composer/export-html";
import { currentMonthYyyyMm } from "@/lib/homepage-composer/month-drafts";
import type { HomepageComposerState } from "@/lib/homepage-composer/types";

function withMonthFields(
  state: Omit<
    HomepageComposerState,
    "workingMonth" | "monthDrafts" | "monthSaved"
  >,
): HomepageComposerState {
  const workingMonth = currentMonthYyyyMm();
  const snapshot = {
    cards: state.cards,
    selectedEventIds: state.selectedEventIds,
    announcements: state.header.announcements.map((row) => ({ ...row })),
  };
  return {
    ...state,
    workingMonth,
    monthDrafts: { [workingMonth]: snapshot },
    monthSaved: {},
  };
}

describe("homepage header buttonCount", () => {
  it("defaults to 2 hero buttons", () => {
    assert.equal(defaultHeader("Test").buttonCount, 2);
  });

  it("normalizes missing buttonCount from button2 label", () => {
    const withSecond = normalizeComposerState(
      {
        header: {
          ...defaultHeader("Test"),
          buttonCount: undefined,
          button2Label: "Sponsor",
        },
        footer: defaultFooter(),
        cardsSectionTitle: defaultCardsSectionTitle(),
        resources: [],
        selectedEventIds: [],
        cards: [],
      },
      "Test",
    );
    assert.ok(withSecond);
    assert.equal(withSecond!.header.buttonCount, 2);

    const oneOnly = normalizeComposerState(
      {
        header: {
          ...defaultHeader("Test"),
          buttonCount: undefined,
          button2Label: "",
        },
        footer: defaultFooter(),
        cardsSectionTitle: defaultCardsSectionTitle(),
        resources: [],
        selectedEventIds: [],
        cards: [],
      },
      "Test",
    );
    assert.ok(oneOnly);
    assert.equal(oneOnly!.header.buttonCount, 1);
  });

  it("exports only one hero button when buttonCount is 1", () => {
    const header = {
      ...defaultHeader("Test"),
      buttonCount: 1 as const,
      button1Label: "Volunteer",
      button1Url: "https://example.com/vol",
      button2Label: "Hidden Sponsor",
      button2Url: "https://example.com/sponsor",
    };
    const html = buildHomepageHeroButtonsHtml(header);
    assert.match(html, /Volunteer/);
    assert.doesNotMatch(html, /Hidden Sponsor/);
    assert.equal((html.match(/ees-btn/g) ?? []).length, 1);

    const full = exportHomepageHtml(
      withMonthFields({
        header,
        footer: defaultFooter(),
        cardsSectionTitle: defaultCardsSectionTitle(),
        resources: [],
        selectedEventIds: [],
        cards: [],
      }),
    );
    assert.match(full, /Volunteer/);
    assert.doesNotMatch(full, /Hidden Sponsor/);
  });
});
