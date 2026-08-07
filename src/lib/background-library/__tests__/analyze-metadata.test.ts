import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBackgroundAssetVisionMetadata } from "../metadata-parse.ts";

describe("parseBackgroundAssetVisionMetadata", () => {
  it("maps vision JSON into clean library fields", () => {
    const parsed = parseBackgroundAssetVisionMetadata({
      title: "Lavender School Supplies Background",
      filenameLabel: "lavender-school-supplies-background.png",
      description: "Illustrated lavender school supplies on a soft desk scene.",
      tags: [
        "back to school",
        "lavender",
        "school supplies",
        "notebook",
        "pencil",
        "scissors",
        "elementary",
        "illustrated",
      ],
      colors: ["lavender", "cream", "#c4b5e0"],
      style: "illustrated",
      audience: "elementary families",
      objects: ["notebook", "pencil", "scissors"],
      season: "fall",
      schoolLevel: "elementary",
      librarySlugs: ["back-to-school", "generic"],
    });
    assert.ok(parsed);
    assert.equal(parsed!.title, "Lavender School Supplies Background");
    assert.equal(
      parsed!.filenameLabel,
      "lavender-school-supplies-background.png",
    );
    assert.ok(parsed!.tags.includes("back to school"));
    assert.equal(parsed!.season, "fall");
    assert.equal(parsed!.schoolLevel, "elementary");
    assert.deepEqual(parsed!.librarySlugs, ["back-to-school", "generic"]);
  });

  it("rejects empty titles and defaults season/level", () => {
    assert.equal(parseBackgroundAssetVisionMetadata({ title: "" }), null);
    const parsed = parseBackgroundAssetVisionMetadata({
      title: "Soft Abstract Wash",
      season: "nope",
      school_level: "k5",
      librarySlugs: ["mystery"],
    });
    assert.ok(parsed);
    assert.equal(parsed!.season, "anytime");
    assert.equal(parsed!.schoolLevel, "any");
    assert.deepEqual(parsed!.librarySlugs, ["generic"]);
    assert.match(parsed!.filenameLabel, /\.png$/);
  });
});
