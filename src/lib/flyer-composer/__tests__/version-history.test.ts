import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FLYER_COMPOSER_MAX_VERSIONS,
  addFlyerComposerVersion,
  findFlyerComposerVersion,
  normalizeFlyerComposerVersions,
  slimFlyerComposerVersionsForQuota,
} from "@/lib/flyer-composer/version-history";

describe("flyer composer version history", () => {
  it("normalizes and caps versions, dropping invalid or duplicate urls", () => {
    const raw = [
      { id: "a", imageUrl: "https://cdn.example/a.png", createdAt: 3 },
      { id: "b", imageUrl: "blob:http://localhost/x", createdAt: 2 },
      { id: "c", imageUrl: "https://cdn.example/a.png", createdAt: 1 },
      { id: "d", imageUrl: "data:image/png;base64,abc", createdAt: 0 },
      null,
      { imageUrl: "" },
    ];
    const versions = normalizeFlyerComposerVersions(raw, 10);
    assert.equal(versions.length, 2);
    assert.equal(versions[0].id, "a");
    assert.equal(versions[1].imageUrl, "data:image/png;base64,abc");
  });

  it("prepends a new version and caps at max", () => {
    let versions: ReturnType<typeof addFlyerComposerVersion> = [];
    for (let i = 0; i < FLYER_COMPOSER_MAX_VERSIONS + 3; i += 1) {
      versions = addFlyerComposerVersion(
        versions,
        `https://cdn.example/${i}.png`,
        { createdAt: i, max: FLYER_COMPOSER_MAX_VERSIONS },
      );
    }
    assert.equal(versions.length, FLYER_COMPOSER_MAX_VERSIONS);
    assert.equal(
      versions[0].imageUrl,
      `https://cdn.example/${FLYER_COMPOSER_MAX_VERSIONS + 2}.png`,
    );
  });

  it("does not duplicate the same image url when regenerating is skipped", () => {
    const url = "https://cdn.example/same.png";
    const once = addFlyerComposerVersion([], url, { id: "v1", createdAt: 1 });
    const twice = addFlyerComposerVersion(once, url, { id: "v2", createdAt: 2 });
    assert.equal(twice.length, 1);
    assert.equal(twice[0].id, "v2");
  });

  it("finds a version by id", () => {
    const versions = addFlyerComposerVersion([], "https://cdn.example/x.png", {
      id: "keep",
    });
    assert.equal(findFlyerComposerVersion(versions, "keep")?.imageUrl, "https://cdn.example/x.png");
    assert.equal(findFlyerComposerVersion(versions, "missing"), null);
  });

  it("slims data urls for quota while keeping current", () => {
    const versions = normalizeFlyerComposerVersions([
      { id: "1", imageUrl: "data:image/png;base64,old", createdAt: 1 },
      { id: "2", imageUrl: "https://cdn.example/keep.png", createdAt: 2 },
      { id: "3", imageUrl: "data:image/png;base64,cur", createdAt: 3 },
    ]);
    const slim = slimFlyerComposerVersionsForQuota(
      versions,
      "data:image/png;base64,cur",
    );
    assert.deepEqual(
      slim.map((v) => v.imageUrl),
      ["https://cdn.example/keep.png", "data:image/png;base64,cur"],
    );
  });
});
