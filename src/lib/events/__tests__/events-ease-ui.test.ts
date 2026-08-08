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

  it("opens Create Event as a modal popout from New event", () => {
    assert.match(home, /CreateEventModal/);
    assert.match(home, /setCreateOpen\(true\)/);
    assert.match(home, /playbookOptions/);
    assert.doesNotMatch(home, /href="\/events\/create"/);
  });

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

  it("fills compact list thumbs edge-to-edge while focus keeps full poster", () => {
    const artworkHover = readSrc(
      "../../../components/artwork/ArtworkHoverThumbnail.tsx",
    );
    // Compact queue thumbs use cover; focus/non-compact keeps contain.
    assert.match(artworkHover, /resize=\{compact \? "cover" : "contain"\}/);
    assert.match(artworkHover, /objectFit: compact \? "cover" : "contain"/);
    assert.match(artworkHover, /object-cover object-center/);
    assert.match(artworkHover, /object-contain object-center p-0\.5/);
    assert.match(ease, /h-\[88px\] w-\[88px\] shrink-0 rounded-\[14px\]/);
    assert.match(
      ease,
      /EventsEaseAheadCard[\s\S]*?grid-cols-\[88px_1fr\][\s\S]*?gap-3[\s\S]*?p-3/,
    );
    assert.match(artworkHover, /Compact list/);
  });

  it("requests square Supabase transforms for poster thumbs (no sliced/squished art)", () => {
    // Regression: Supabase's render/image transform only crops to whichever
    // single axis is given and leaves the other axis at native source size
    // (e.g. a 128-wide request against a 1024x1024 source came back
    // 128x1024, not proportionally 128x128). That squished/sliced the
    // EventsEaseQueueRow ("Also ahead") thumbs into thin vertical strips
    // bleeding past the rounded rail. displayHeight must always be sent
    // alongside displayWidth so Supabase returns a real square; compact
    // list presentation then uses cover (focus/lightbox keep contain).
    const artworkHover = readSrc(
      "../../../components/artwork/ArtworkHoverThumbnail.tsx",
    );
    assert.match(artworkHover, /displayHeight=\{compact \? 128 : 256\}/);
    assert.match(artworkHover, /resize=\{compact \? "cover" : "contain"\}/);
    assert.match(ease, /EventsEaseQueueRow/);
    assert.match(ease, /h-12 w-12 rounded-\[14px\] sm:h-14 sm:w-14/);
  });
});
