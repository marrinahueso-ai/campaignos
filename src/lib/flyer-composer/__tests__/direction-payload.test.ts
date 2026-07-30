import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSampleDirectionInput,
  directionTextIncludesAllSetFields,
  listSetDirectionFields,
} from "@/lib/flyer-composer/direction-payload";
import {
  buildFlyerComposerSlotsUserPrompt,
  summarizeFlyerComposerDirection,
} from "@/lib/flyer-composer/generate-slots-prompt";

describe("flyer composer direction payload", () => {
  it("includes every set inspiration field in the AI user prompt", () => {
    const input = buildSampleDirectionInput();
    const prompt = buildFlyerComposerSlotsUserPrompt(
      input,
      "Sample Elementary PTA",
      "Warm, welcoming",
    );

    assert.equal(
      directionTextIncludesAllSetFields(prompt, input.fields),
      true,
      `Missing fields: ${listSetDirectionFields(input.fields)
        .filter((key) => !prompt.includes(input.fields[key]!.trim()))
        .join(", ")}`,
    );
  });

  it("summarizes direction with start path, template, brand, and filled slots", () => {
    const input = buildSampleDirectionInput();
    const lines = summarizeFlyerComposerDirection(input);

    assert.ok(lines.some((line) => line.includes("New flyer")));
    assert.ok(lines.some((line) => line.includes("Simple flyer")));
    assert.ok(lines.some((line) => line.includes("Brand kit: on")));
    assert.ok(lines.some((line) => line.includes("Slots filled:")));
    assert.ok(lines.some((line) => line.includes("Last-year notes included")));
  });
});
