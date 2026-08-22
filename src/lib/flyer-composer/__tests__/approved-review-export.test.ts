import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const review = readFileSync(
  new URL("../../../components/flyers/FlyerApproverReviewShell.tsx", import.meta.url),
  "utf8",
);

describe("approved flyer review exports", () => {
  it("exposes download, print, and save-to-files after approval", () => {
    assert.match(review, /status === "approved"/);
    assert.match(review, /Export & Actions/);
    assert.match(review, /downloadFlyerExport/);
    assert.match(review, /printFlyerExport/);
    assert.match(review, /saveFlyerToEventFiles/);
    assert.match(review, /Save to Files/);
  });
});
