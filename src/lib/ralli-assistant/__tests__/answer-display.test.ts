import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatEventChipLabel,
  formatEventDateLabel,
  prepareAnswerForDisplay,
  stripMarkdownLinks,
} from "../answer-display.ts";

describe("stripMarkdownLinks", () => {
  it("replaces markdown links with the label only", () => {
    const input =
      "Open [Approvals](/approvals) or [Today](https://example.com/dashboard).";
    assert.equal(
      stripMarkdownLinks(input),
      "Open Approvals or Today.",
    );
  });
});

describe("prepareAnswerForDisplay", () => {
  it("strips markdown links and trailing Quick links blocks", () => {
    const input = [
      "Here’s your briefing. See [Approvals](/approvals).",
      "",
      "Quick links:",
      "• Approvals: /approvals",
      "• Today: /dashboard",
    ].join("\n");
    const out = prepareAnswerForDisplay(input, { hasLinkChips: true });
    assert.equal(out, "Here’s your briefing. See Approvals.");
    assert.doesNotMatch(out, /\[Approvals\]/);
    assert.doesNotMatch(out, /Quick links/i);
  });
});

describe("formatEventDateLabel / formatEventChipLabel", () => {
  it("formats YYYY-MM-DD for chips", () => {
    assert.equal(formatEventDateLabel("2026-08-05"), "Aug 5, 2026");
    assert.equal(
      formatEventChipLabel("Back to School Fair", "2026-08-05"),
      "Back to School Fair · Aug 5, 2026",
    );
  });
});
