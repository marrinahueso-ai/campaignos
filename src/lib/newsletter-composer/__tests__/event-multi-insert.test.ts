import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildBlocksFromEventSelection,
  ensureStoriesForEvents,
  insertCanvasBlocksAfter,
  moveCanvasColumn,
  newCanvasBlock,
  shiftCanvasColumn,
} from "@/lib/newsletter-composer/defaults";
import type { NewsletterComposerEvent } from "@/lib/newsletter-composer/types";

function fakeEvent(
  id: string,
  title: string,
  overrides: Partial<NewsletterComposerEvent> = {},
): NewsletterComposerEvent {
  return {
    id,
    title,
    description: `${title} details`,
    date: "2026-08-01",
    time: "10:00 AM",
    location: "Gym",
    imageUrl: `https://example.com/${id}.jpg`,
    volunteerSignupUrl: "",
    ...overrides,
  };
}

describe("buildBlocksFromEventSelection", () => {
  it("creates one event block per selection for card layout", () => {
    const events = [fakeEvent("a", "A"), fakeEvent("b", "B")];
    const { storyIds } = ensureStoriesForEvents([], events);
    const blocks = buildBlocksFromEventSelection(events, "card", storyIds);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0]?.kind, "event");
    assert.equal(blocks[0]?.eventLayout, "card");
    assert.equal(blocks[0]?.storyId, storyIds[0]);
    assert.equal(blocks[1]?.storyId, storyIds[1]);
  });

  it("fills a single grid from all selected events", () => {
    const events = [
      fakeEvent("a", "A"),
      fakeEvent("b", "B"),
      fakeEvent("c", "C"),
      fakeEvent("d", "D"),
    ];
    const { storyIds } = ensureStoriesForEvents([], events);
    const blocks = buildBlocksFromEventSelection(events, "grid", storyIds);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.kind, "grid");
    assert.equal(blocks[0]?.columns.length, 4);
    assert.equal(blocks[0]?.columns[0]?.heading, "A");
    assert.equal(blocks[0]?.columns[3]?.heading, "D");
  });

  it("fills a columns block from the selection", () => {
    const events = [fakeEvent("a", "A"), fakeEvent("b", "B")];
    const { storyIds } = ensureStoriesForEvents([], events);
    const blocks = buildBlocksFromEventSelection(events, "columns", storyIds);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.kind, "columns");
    assert.equal(blocks[0]?.columns.length, 2);
  });

  it("creates one text+image block per event", () => {
    const events = [fakeEvent("a", "A"), fakeEvent("b", "B")];
    const { storyIds } = ensureStoriesForEvents([], events);
    const blocks = buildBlocksFromEventSelection(events, "textImage", storyIds);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0]?.kind, "textImage");
    assert.equal(blocks[0]?.heading, "A");
    assert.equal(blocks[1]?.heading, "B");
  });
});

describe("insertCanvasBlocksAfter", () => {
  it("inserts a batch after the selected block", () => {
    const a = newCanvasBlock("heading", { id: "a" });
    const b = newCanvasBlock("text", { id: "b" });
    const c = newCanvasBlock("grid", { id: "c" });
    const d = newCanvasBlock("event", { id: "d" });
    const next = insertCanvasBlocksAfter([a, b], [c, d], "a");
    assert.deepEqual(
      next.map((block) => block.id),
      ["a", "c", "d", "b"],
    );
  });
});

describe("moveCanvasColumn", () => {
  it("reorders grid cards without dropping any", () => {
    const columns = [
      { id: "early", heading: "Early Release" },
      { id: "lights", heading: "Friday Night Lights" },
      { id: "club", heading: "Explorer Book Club" },
    ].map((col) => ({
      id: col.id,
      heading: col.heading,
      text: "",
      imageUrl: null,
      imageLink: "",
      imageAlt: "",
      buttonLabel: "",
      buttonUrl: "",
    }));

    const moved = moveCanvasColumn(columns, "early", "lights");
    assert.deepEqual(
      moved.map((column) => column.id),
      ["lights", "early", "club"],
    );

    const shifted = shiftCanvasColumn(columns, "club", -1);
    assert.deepEqual(
      shifted.map((column) => column.id),
      ["early", "club", "lights"],
    );
  });

  it("does nothing when the card is already first or last", () => {
    const columns = [
      {
        id: "a",
        heading: "A",
        text: "",
        imageUrl: null,
        imageLink: "",
        imageAlt: "",
        buttonLabel: "",
        buttonUrl: "",
      },
      {
        id: "b",
        heading: "B",
        text: "",
        imageUrl: null,
        imageLink: "",
        imageAlt: "",
        buttonLabel: "",
        buttonUrl: "",
      },
    ];
    assert.equal(shiftCanvasColumn(columns, "a", -1), columns);
    assert.equal(shiftCanvasColumn(columns, "b", 1), columns);
  });
});

describe("newsletter grid card rearrange", () => {
  it("lets canvas cards drag independently of the block grip", () => {
    const canvas = readFileSync(
      new URL(
        "../../../components/newsletters/builder/CanvasBlockFrame.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const settings = readFileSync(
      new URL(
        "../../../components/newsletters/builder/BlockSettingsPanel.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(canvas, /data-canvas-column-id/);
    assert.match(canvas, /onColumnDragStart/);
    assert.match(settings, /shiftCanvasColumn/);
    assert.match(settings, /Move \$\{label\} earlier/);
  });
});
