import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildCaptionRevisionGuide,
  isDuplicateCaptionDirection,
} from "../caption-revision-prompt.ts";
import { CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES } from "../prompt-guardrails.ts";
import { deriveAiInstructionsFromNote } from "../../approvals-revision/revision-notes.ts";

function readCaptionPromptsSource(): string {
  return readFileSync(new URL("../caption-prompts.ts", import.meta.url), "utf8");
}

describe("buildCaptionRevisionGuide", () => {
  it("frames short revision notes as non-literal direction", () => {
    const guide = buildCaptionRevisionGuide({
      revisionInstructions: "Make it shorter and more excited",
    });
    assert.match(guide, /User revision direction:/);
    assert.match(guide, /Make it shorter and more excited/);
    assert.match(guide, /Interpret the intent/);
    assert.match(guide, /Do not quote, repeat, mention, or paste/);
    assert.match(guide, /Return only the revised caption content/);
    assert.doesNotMatch(guide, /User instructions:/);
  });

  it("frames content-direction notes the same way", () => {
    const guide = buildCaptionRevisionGuide({
      revisionInstructions: "Say less about volunteers and emphasize Friday",
      existingCaption: "Join our volunteers this weekend!",
    });
    assert.match(guide, /User revision direction:/);
    assert.match(guide, /Say less about volunteers and emphasize Friday/);
    assert.match(guide, /Do not quote, repeat, mention, or paste/);
    assert.match(guide, /Draft to revise:/);
    assert.match(guide, /Join our volunteers this weekend!/);
  });
});

describe("isDuplicateCaptionDirection", () => {
  it("treats same note as duplicate ignoring case and trailing periods", () => {
    assert.equal(
      isDuplicateCaptionDirection(
        "Make it shorter and more excited.",
        "make it shorter and more excited",
      ),
      true,
    );
  });

  it("treats Tone: suffix as still duplicate of captionNotes", () => {
    assert.equal(
      isDuplicateCaptionDirection(
        "Make it warmer",
        "Make it warmer. Tone: Friendly",
      ),
      true,
    );
  });

  it("treats distinct notes as not duplicate", () => {
    assert.equal(
      isDuplicateCaptionDirection(
        "Mention Friday",
        "Make it shorter and more excited",
      ),
      false,
    );
  });
});

describe("buildCampaignBuilderCaptionPrompts wiring", () => {
  it("uses revision guide + dedupe instead of bare User instructions", () => {
    const source = readCaptionPromptsSource();
    assert.match(source, /buildCaptionRevisionGuide/);
    assert.match(source, /isDuplicateCaptionDirection/);
    assert.match(source, /campaignRevisionGuide/);
    assert.doesNotMatch(source, /User instructions:/);
    assert.match(source, /CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES/);
  });

  it("suppresses milestone captionNotes when regenerate instructions duplicate them", () => {
    const source = readCaptionPromptsSource();
    assert.match(
      source,
      /isDuplicateCaptionDirection\(captionNotesRaw, userRevisionInstructions\)/,
    );
    assert.match(source, /Prefer the regenerate/);
  });

  it("keeps shared do-not-paste-notes guardrail in the prompt assembly", () => {
    assert.match(
      CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES,
      /Do not paste user notes verbatim/,
    );
    const source = readCaptionPromptsSource();
    assert.match(source, /CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES/);
  });
});

describe("Approvals deriveAiInstructionsFromNote → regenerate path", () => {
  it("frames approver feedback as instruction, not caption copy", () => {
    const derived = deriveAiInstructionsFromNote(
      "Please make this warmer and remove the exclamation points",
    );
    assert.match(derived, /Revision direction/i);
    assert.match(derived, /do not paste into the caption/i);
    assert.match(derived, /make this warmer and remove the exclamation points/i);

    const guide = buildCaptionRevisionGuide({
      revisionInstructions: derived,
      existingCaption: "Come join us!!!!!",
    });
    assert.match(guide, /User revision direction:/);
    assert.match(guide, /Do not quote, repeat, mention, or paste/);
    assert.match(guide, /make this warmer and remove the exclamation points/i);
  });
});
