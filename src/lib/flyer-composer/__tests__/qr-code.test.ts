import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampQrSize,
  generateFlyerQrPng,
  isFlyerQrTarget,
} from "@/lib/flyer-composer/qr-code";

describe("flyer composer QR generation", () => {
  it("accepts only http(s) targets", () => {
    assert.equal(isFlyerQrTarget("https://example.org/calendar"), true);
    assert.equal(isFlyerQrTarget("http://example.org/x"), true);
    assert.equal(isFlyerQrTarget("javascript:alert(1)"), false);
    assert.equal(isFlyerQrTarget(""), false);
  });

  it("clamps QR pixel size", () => {
    assert.equal(clampQrSize(12), 64);
    assert.equal(clampQrSize(256), 256);
    assert.equal(clampQrSize(5000), 1024);
  });

  it("generates a PNG buffer in-process", async () => {
    const png = await generateFlyerQrPng("https://example.org/calendar", 128);
    assert.ok(png);
    assert.ok(png!.length > 100);
    // PNG signature
    assert.equal(png!.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  });
});
