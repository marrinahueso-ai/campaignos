import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("events ease UI contracts", () => {
  const home = readSrc(
    "../../../components/events-phase3/EventsHomeContent.tsx",
  );
  const ease = readSrc(
    "../../../components/events-phase3/EventsEaseList.tsx",
  );

  it("uses ease focus/queue instead of KPI summary cards", () => {
    assert.match(home, /Create with AI/);
    assert.match(home, /EventsEaseFocusCard/);
    assert.doesNotMatch(home, /EventsHomeSummaryCards/);
    assert.doesNotMatch(home, /EventsUpcomingSection/);
    assert.doesNotMatch(home, /EventsEaseMonthGlance/);
  });

  it("keeps simplified filter pills and full calendar link", () => {
    assert.match(home, /PULSE_TABS/);
    assert.match(home, /Upcoming/);
    assert.match(home, /Next month/);
    assert.match(home, /Archived/);
    assert.match(home, /Full calendar/);
    assert.match(ease, /Upcoming · Next month · All · Archived/);
    assert.doesNotMatch(home, /Needs setup|Ready to run|Follow-up|Month at a glance/i);
  });

  it("keeps the focus card calm with two CTAs", () => {
    const focusCard = ease.match(
      /export function EventsEaseFocusCard\([\s\S]*?(?=export function EventsEaseAheadCard)/,
    )?.[0];
    assert.ok(focusCard);
    assert.match(focusCard, /Open event/);
    assert.match(focusCard, />\s*Social\s*</);
    assert.doesNotMatch(focusCard, /Artwork and social may still be open/);
    assert.doesNotMatch(focusCard, /homepage-composer/);
    assert.doesNotMatch(focusCard, /newsletter-composer/);
  });

  it("exposes artwork enlarge and download on list thumbnails", () => {
    const artworkHover = readSrc(
      "../../../components/artwork/ArtworkHoverThumbnail.tsx",
    );
    assert.match(ease, /ArtworkHoverThumbnail/);
    assert.match(ease, /ArtworkPreviewActions/);
    assert.match(artworkHover, /Enlarge artwork/);
    assert.match(artworkHover, /Download artwork/);
    assert.doesNotMatch(artworkHover, /Click to enlarge/);
  });

  it("fills event card artwork rails instead of 1:1 letterbox", () => {
    const artworkHover = readSrc(
      "../../../components/artwork/ArtworkHoverThumbnail.tsx",
    );
    assert.match(artworkHover, /object-cover object-center/);
    assert.doesNotMatch(artworkHover, /displayHeight=\{compact \? 128 : 256\}/);
    assert.doesNotMatch(artworkHover, /resize="contain"/);
    // Fixed square ahead thumbs — h-full was stretching landscape art.
    assert.match(ease, /h-\[88px\] w-\[88px\] shrink-0/);
    assert.match(artworkHover, /Do not set h-full here/);
  });
});
