import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EVENT_SOCIAL_INSPIRATION_LABEL,
  isUserChosenFlyerInspiration,
  parseFlyerInspirationPhotoSource,
  resolveFlyerInspirationForEvent,
} from "@/lib/flyer-composer/inspiration-source";

describe("flyer inspiration from a linked event", () => {
  it("parses event as a valid inspiration source", () => {
    assert.equal(parseFlyerInspirationPhotoSource("event"), "event");
    assert.equal(parseFlyerInspirationPhotoSource("upload"), "upload");
    assert.equal(parseFlyerInspirationPhotoSource("gallery"), null);
    assert.equal(isUserChosenFlyerInspiration("upload"), true);
    assert.equal(isUserChosenFlyerInspiration("event"), false);
  });

  it("uses the event’s social artwork when no inspiration was chosen", () => {
    const next = resolveFlyerInspirationForEvent({
      currentUrl: null,
      currentSource: null,
      currentLabel: null,
      eventImageUrl: "https://cdn.example/play-date-social.png",
    });
    assert.equal(next.url, "https://cdn.example/play-date-social.png");
    assert.equal(next.source, "event");
    assert.equal(next.label, EVENT_SOCIAL_INSPIRATION_LABEL);
  });

  it("does not overwrite an uploaded or gallery photo", () => {
    const uploaded = resolveFlyerInspirationForEvent({
      currentUrl: "data:image/png;base64,abc",
      currentSource: "upload",
      currentLabel: "Picnic photo",
      eventImageUrl: "https://cdn.example/play-date-social.png",
    });
    assert.equal(uploaded.url, "data:image/png;base64,abc");
    assert.equal(uploaded.source, "upload");
    assert.equal(uploaded.label, "Picnic photo");

    const library = resolveFlyerInspirationForEvent({
      currentUrl: "https://cdn.example/gallery.jpg",
      currentSource: "library",
      currentLabel: "Fall leaves",
      eventImageUrl: "https://cdn.example/play-date-social.png",
    });
    assert.equal(library.source, "library");
    assert.equal(library.url, "https://cdn.example/gallery.jpg");
  });

  it("clears event-sourced inspiration when the event has no artwork", () => {
    const next = resolveFlyerInspirationForEvent({
      currentUrl: "https://cdn.example/old-social.png",
      currentSource: "event",
      currentLabel: EVENT_SOCIAL_INSPIRATION_LABEL,
      eventImageUrl: null,
    });
    assert.equal(next.url, null);
    assert.equal(next.source, null);
    assert.equal(next.label, null);
  });
});
