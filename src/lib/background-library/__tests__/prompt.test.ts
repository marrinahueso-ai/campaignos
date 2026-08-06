import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BACKGROUND_LIBRARY_BATCH_SIZE } from "../constants.ts";
import { buildBackgroundLibraryVariationPrompt } from "../prompt.ts";

describe("buildBackgroundLibraryVariationPrompt", () => {
  it("asks for a single standalone background and forbids grids", () => {
    const prompt = buildBackgroundLibraryVariationPrompt({
      sourceTitle: "Chalkboard fall mood",
      variationIndex: 3,
      batchSize: BACKGROUND_LIBRARY_BATCH_SIZE,
    });

    assert.match(prompt, /Chalkboard fall mood/);
    assert.match(prompt, /variation 3 of 10/);
    assert.match(prompt, /ONE complete background|single standalone/i);
    assert.match(prompt, /Never create a grid|contact sheet|multi-panel/i);
    assert.doesNotMatch(prompt, /1024x1024|9:16|locked aspect/i);
  });
});
