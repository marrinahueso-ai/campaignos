import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSampleDirectionInput,
  listSetDirectionFields,
} from "@/lib/flyer-composer/direction-payload";
import {
  buildFlyerComposerImagePrompt,
  resolveFlyerComposerAiDirection,
} from "@/lib/flyer-composer/generate-image-prompt";
import { summarizeFlyerComposerDirection } from "@/lib/flyer-composer/generate-slots-prompt";

describe("flyer composer direction payload", () => {
  it("image prompt includes event details and freeform AI direction", () => {
    const input = buildSampleDirectionInput();
    const prompt = buildFlyerComposerImagePrompt(input);
    const direction = resolveFlyerComposerAiDirection(input.fields);

    assert.ok(direction.length > 0);
    assert.match(prompt, /EVENT DETAILS/i);
    assert.match(prompt, /Artwork direction from the user/i);
    assert.ok(prompt.includes(direction));

    for (const key of ["orgName", "headline", "schoolYear", "location"] as const) {
      const value = input.fields[key]?.trim();
      assert.ok(value && prompt.includes(value), `missing ${key}`);
    }
    assert.match(prompt, /Aug 15 — Back to School Night/);
    assert.match(prompt, /Sep 12 — Fall Festival/);

    assert.ok(listSetDirectionFields(input.fields).includes("aiDirection"));
  });

  it("summarizes direction with start path, template, brand, and AI direction", () => {
    const input = buildSampleDirectionInput();
    const lines = summarizeFlyerComposerDirection(input);

    assert.ok(lines.some((line) => line.includes("New flyer")));
    assert.ok(lines.some((line) => line.includes("Simple flyer")));
    assert.ok(lines.some((line) => line.includes("Brand kit: on")));
    assert.ok(lines.some((line) => line.includes("Slots filled:")));
    assert.ok(lines.some((line) => line.includes("AI direction included")));
  });
});
