import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  filterCampaignOptionsBySearch,
  SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER,
} from "../social-composer-event-search.ts";
import type { CampaignOption } from "../types.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

const today = "2026-07-15";

const options: CampaignOption[] = [
  {
    id: "evt-1",
    title: "School Supply Sorting",
    label: "School Supply Sorting — Aug 4, 2026",
    date: "2026-08-04",
    description: "Volunteers sort supplies in the cafeteria",
    eventOwner: "Jordan Lee",
  },
  {
    id: "evt-2",
    title: "Fall Festival",
    label: "Fall Festival — Oct 12, 2026",
    date: "2026-10-12",
    description: "Community carnival on the lawn",
    eventOwner: null,
  },
];

describe("filterCampaignOptionsBySearch", () => {
  it("returns all options for an empty query", () => {
    assert.deepEqual(
      filterCampaignOptionsBySearch(options, "   ", today).map((option) => option.id),
      ["evt-1", "evt-2"],
    );
  });

  it("matches event title, date tokens, and owner name", () => {
    assert.deepEqual(
      filterCampaignOptionsBySearch(options, "supply", today).map((option) => option.id),
      ["evt-1"],
    );
    assert.deepEqual(
      filterCampaignOptionsBySearch(options, "august 4", today).map((option) => option.id),
      ["evt-1"],
    );
    assert.deepEqual(
      filterCampaignOptionsBySearch(options, "jordan", today).map((option) => option.id),
      ["evt-1"],
    );
    assert.deepEqual(
      filterCampaignOptionsBySearch(options, "october", today).map((option) => option.id),
      ["evt-2"],
    );
  });
});

describe("social composer ease contracts", () => {
  it("Creative Setup uses shared event search placeholder and helper", () => {
    const composer = readSrc(
      "../../../components/campaign-builder-v2/social-composer/SocialMediaComposer.tsx",
    );
    const picker = readSrc(
      "../../../components/campaign-builder-v2/social-composer/SocialComposerEventPicker.tsx",
    );

    assert.match(composer, /SocialComposerEventPicker/);
    assert.match(composer, /Publish now/);
    assert.match(composer, /Schedule for later/);
    assert.match(composer, /Right after approval/);
    assert.match(composer, /Save → Preview/);
    assert.match(composer, /selectCampaign/);
    assert.match(picker, /filterCampaignOptionsBySearch/);
    assert.match(picker, /SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER/);
    assert.equal(
      SOCIAL_COMPOSER_EVENT_SEARCH_PLACEHOLDER,
      "Search events, people, dates…",
    );
  });
});
