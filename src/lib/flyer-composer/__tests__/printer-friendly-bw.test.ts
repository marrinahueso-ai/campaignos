import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyPrinterFriendlyBw } from "../printer-friendly-bw.ts";

function pixel(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, a]);
}

describe("printer-friendly B&W transform", () => {
  it("lifts cream/pale fills to paper white", () => {
    const cream = pixel(255, 252, 247);
    applyPrinterFriendlyBw(cream);
    assert.equal(cream[0], 255);
    assert.equal(cream[1], 255);
    assert.equal(cream[2], 255);
    assert.equal(cream[3], 255);
  });

  it("crushes dark ink and QR modules to true black", () => {
    const ink = pixel(13, 126, 94);
    applyPrinterFriendlyBw(ink);
    assert.equal(ink[0], 0);
    assert.equal(ink[1], 0);
    assert.equal(ink[2], 0);
  });

  it("keeps midtone photos as grayscale, not binary", () => {
    const photo = pixel(180, 150, 140);
    applyPrinterFriendlyBw(photo);
    assert.equal(photo[0], photo[1]);
    assert.equal(photo[1], photo[2]);
    assert.ok(photo[0]! > 20 && photo[0]! < 240);
  });
});
