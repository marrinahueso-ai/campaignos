import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBackgroundStoragePath,
  isBackgroundLibraryStoragePath,
} from "../paths.ts";

describe("background library storage paths", () => {
  it("accepts paths produced by buildBackgroundStoragePath", () => {
    const sourcePath = buildBackgroundStoragePath("sources", "Fall Leaves.png");
    const assetPath = buildBackgroundStoragePath("assets", "winter.webp");
    assert.equal(isBackgroundLibraryStoragePath("sources", sourcePath), true);
    assert.equal(isBackgroundLibraryStoragePath("assets", assetPath), true);
    assert.equal(isBackgroundLibraryStoragePath("assets", sourcePath), false);
  });

  it("rejects traversal and mismatched kinds", () => {
    assert.equal(
      isBackgroundLibraryStoragePath("sources", "sources/../secrets.png"),
      false,
    );
    assert.equal(
      isBackgroundLibraryStoragePath(
        "assets",
        "assets/not-a-uuid-file.png",
      ),
      false,
    );
  });
});
