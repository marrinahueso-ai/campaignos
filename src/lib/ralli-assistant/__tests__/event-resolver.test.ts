import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatAmbiguousEventAnswer,
  formatNoEventAnswer,
  resolveEventFromQuestion,
  type ResolvableEvent,
} from "../event-resolver.ts";

const EVENTS: ResolvableEvent[] = [
  {
    id: "evt-bts",
    title: "Back to School Fair",
    date: "2026-08-20",
    status: "scheduled",
  },
  {
    id: "evt-spring",
    title: "Spring Carnival",
    date: "2026-04-10",
    status: "draft",
  },
  {
    id: "evt-fall",
    title: "Fall Festival",
    date: "2026-10-05",
    status: "scheduled",
  },
  {
    id: "evt-bts-2",
    title: "Back to School Night",
    date: "2026-09-01",
    status: "draft",
  },
];

describe("resolveEventFromQuestion", () => {
  it("uses pathname event id when present", () => {
    const result = resolveEventFromQuestion(
      "What should I do next?",
      EVENTS,
      "/events/evt-spring/campaign-builder",
    );
    assert.equal(result.kind, "matched");
    if (result.kind === "matched") {
      assert.equal(result.event.id, "evt-spring");
    }
  });

  it("fuzzy matches event title tokens", () => {
    const result = resolveEventFromQuestion(
      "What should I do next for Back to School Fair?",
      EVENTS,
      null,
    );
    assert.equal(result.kind, "matched");
    if (result.kind === "matched") {
      assert.equal(result.event.id, "evt-bts");
    }
  });

  it("returns ambiguous when multiple events match equally", () => {
    const result = resolveEventFromQuestion(
      "What's next for Back to School?",
      EVENTS,
      null,
    );
    assert.equal(result.kind, "ambiguous");
    if (result.kind === "ambiguous") {
      assert.ok(result.candidates.length >= 2);
      const ids = result.candidates.map((event) => event.id);
      assert.ok(ids.includes("evt-bts"));
      assert.ok(ids.includes("evt-bts-2"));
    }
  });

  it("returns none when nothing matches", () => {
    const result = resolveEventFromQuestion(
      "What's next for Winter Gala?",
      EVENTS,
      null,
    );
    assert.equal(result.kind, "none");
    if (result.kind === "none") {
      assert.equal(result.reason, "no_match");
    }
  });

  it("formats clarifying answers without inventing facts", () => {
    const ambiguous = formatAmbiguousEventAnswer([
      EVENTS[0]!,
      EVENTS[3]!,
    ]);
    assert.match(ambiguous, /more than one matching event/i);
    assert.match(ambiguous, /Back to School Fair/);
    assert.match(ambiguous, /Back to School Night/);

    const none = formatNoEventAnswer("no_match");
    assert.match(none, /couldn’t match/i);
  });
});
