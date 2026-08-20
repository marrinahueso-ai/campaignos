import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STYLE_LOCK_INSTRUCTION_PREFIX,
  applyStyleLockToInstructions,
  resolveStyleStrengthForLock,
  shouldRestyleUnlockedArtwork,
} from "../style-lock.ts";

describe("style-lock helpers", () => {
  it("prefixes instructions when locked", () => {
    const result = applyStyleLockToInstructions("Bigger headline", true);
    assert.match(result, /STYLE LOCK:/);
    assert.match(result, /Bigger headline/);
    assert.ok(result.startsWith(STYLE_LOCK_INSTRUCTION_PREFIX));
  });

  it("leaves instructions alone when unlocked", () => {
    assert.equal(
      applyStyleLockToInstructions("Bigger headline", false),
      "Bigger headline",
    );
  });

  it("does not double-prefix an already locked instruction", () => {
    const once = applyStyleLockToInstructions("Warmer tones", true);
    const twice = applyStyleLockToInstructions(once, true);
    assert.equal(twice, once);
  });

  it("raises style strength when locked", () => {
    assert.equal(resolveStyleStrengthForLock(40, true), 90);
    assert.equal(resolveStyleStrengthForLock(95, true), 95);
    assert.equal(resolveStyleStrengthForLock(40, false), 40);
  });

  it("restyles only when unlocked and More Creative", () => {
    assert.equal(shouldRestyleUnlockedArtwork(false, 0), true);
    assert.equal(shouldRestyleUnlockedArtwork(false, 20), true);
    assert.equal(shouldRestyleUnlockedArtwork(false, 35), false);
    assert.equal(shouldRestyleUnlockedArtwork(false, 50), false);
    assert.equal(shouldRestyleUnlockedArtwork(true, 0), false);
  });
});
