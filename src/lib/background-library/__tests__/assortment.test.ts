import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assetMatchesLibrarySearch,
  assortBackgroundAssets,
  filterAndAssortBackgroundAssets,
  normalizeLibrarySearch,
  type AssortableBackgroundAsset,
} from "../assortment.ts";

function asset(
  partial: Partial<AssortableBackgroundAsset> & { id: string },
): AssortableBackgroundAsset {
  return {
    sourceId: null,
    title: "",
    tags: [],
    colors: [],
    season: "anytime",
    libraryNames: [],
    usageCount: 0,
    ...partial,
  };
}

describe("background library assortment", () => {
  it("normalizes back-to-school search variants", () => {
    assert.equal(normalizeLibrarySearch("Back to School"), "backtoschool");
    assert.equal(normalizeLibrarySearch("backto school"), "backtoschool");
    assert.equal(normalizeLibrarySearch("back-to-school!"), "backtoschool");
  });

  it("matches library name and tags with spaced or compacted query", () => {
    const row = asset({
      id: "1",
      title: "Pencil banner",
      tags: ["back to school", "welcome"],
      libraryNames: ["Back to School"],
    });
    assert.equal(assetMatchesLibrarySearch(row, "backto school"), true);
    assert.equal(assetMatchesLibrarySearch(row, "Back to School"), true);
    assert.equal(assetMatchesLibrarySearch(row, "winter"), false);
  });

  it("interleaves same-source likeness batches for variety", () => {
    const rows = [
      asset({ id: "a1", sourceId: "src-a", title: "A1" }),
      asset({ id: "a2", sourceId: "src-a", title: "A2" }),
      asset({ id: "a3", sourceId: "src-a", title: "A3" }),
      asset({ id: "b1", sourceId: "src-b", title: "B1" }),
      asset({ id: "b2", sourceId: "src-b", title: "B2" }),
      asset({ id: "c1", sourceId: "src-c", title: "C1" }),
    ];
    const ordered = assortBackgroundAssets(rows);
    const sources = ordered.map((row) => row.sourceId);
    // First three should come from three different sources (round-robin).
    assert.equal(new Set(sources.slice(0, 3)).size, 3);
    // No three consecutive from the same source.
    for (let i = 0; i < sources.length - 2; i += 1) {
      assert.notEqual(
        sources[i] === sources[i + 1] && sources[i + 1] === sources[i + 2],
        true,
      );
    }
  });

  it("prefers lower usage within a source group", () => {
    const rows = [
      asset({ id: "a-high", sourceId: "src-a", usageCount: 12 }),
      asset({ id: "a-low", sourceId: "src-a", usageCount: 1 }),
      asset({ id: "b1", sourceId: "src-b", usageCount: 0 }),
    ];
    const ordered = assortBackgroundAssets(rows);
    const fromA = ordered.filter((row) => row.sourceId === "src-a");
    assert.equal(fromA[0]?.id, "a-low");
    assert.equal(fromA[1]?.id, "a-high");
  });

  it("filters then assorts", () => {
    const rows = [
      asset({
        id: "1",
        sourceId: "s1",
        tags: ["back to school"],
        libraryNames: ["Back to School"],
      }),
      asset({
        id: "2",
        sourceId: "s2",
        tags: ["winter"],
        libraryNames: ["Winter"],
      }),
      asset({
        id: "3",
        sourceId: "s3",
        tags: ["bts", "back to school"],
        libraryNames: ["Back to School"],
      }),
    ];
    const result = filterAndAssortBackgroundAssets(rows, "backtoschool");
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((row) => row.id).sort(),
      ["1", "3"],
    );
  });
});
