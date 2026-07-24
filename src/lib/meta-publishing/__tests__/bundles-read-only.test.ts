import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("meta publish bundles read path", () => {
  it("does not sync/write slots inside the GET loader", () => {
    const source = readFileSync(
      new URL("../bundles.ts", import.meta.url),
      "utf8",
    );
    const loaderStart = source.indexOf("async function loadMetaPublishBundles(");
    assert.ok(loaderStart >= 0, "loadMetaPublishBundles should exist");
    const loaderBody = source.slice(loaderStart, loaderStart + 1600);
    assert.doesNotMatch(loaderBody, /syncMetaPublicationSlots/);
    assert.doesNotMatch(loaderBody, /ensureMetaPublicationSlots/);
    assert.match(source, /export async function syncAndGetMetaPublishBundles/);
    assert.match(
      source,
      /Does \*\*not\*\* sync or write meta_publication_slots/,
    );
  });
});
