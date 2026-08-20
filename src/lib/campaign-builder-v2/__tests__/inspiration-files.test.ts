import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInspirationImageId,
  filesFromDataTransfer,
  inspirationFileKey,
  selectNewInspirationFiles,
} from "../inspiration-utils.ts";

function fakeFile(
  name: string,
  size: number,
  lastModified: number,
): { name: string; size: number; lastModified: number } {
  return { name, size, lastModified };
}

describe("selectNewInspirationFiles", () => {
  it("keeps five distinct logos and drops Safari copies of the same file", () => {
    const files = [
      fakeFile("abstract.png", 111, 1),
      fakeFile("nb-mark.png", 222, 2),
      fakeFile("tennessee-joe.png", 333, 3),
      fakeFile("sponsor-a.png", 444, 4),
      fakeFile("sponsor-b.png", 555, 5),
      fakeFile("tennessee-joe.png", 333, 3),
      fakeFile("tennessee-joe.png", 333, 3),
    ];

    const selected = selectNewInspirationFiles(files, [], 10);

    assert.deepEqual(
      selected.map((file) => file.name),
      [
        "abstract.png",
        "nb-mark.png",
        "tennessee-joe.png",
        "sponsor-a.png",
        "sponsor-b.png",
      ],
    );
  });

  it("skips a file already attached by name+size+lastModified", () => {
    const existing = fakeFile("tennessee-joe.png", 333, 3);
    const incoming = [
      fakeFile("tennessee-joe.png", 333, 3),
      fakeFile("new-sponsor.png", 888, 8),
    ];

    const selected = selectNewInspirationFiles(
      incoming,
      [inspirationFileKey(existing)],
      10,
    );

    assert.deepEqual(
      selected.map((file) => file.name),
      ["new-sponsor.png"],
    );
  });

  it("caps remaining slots so earlier files win", () => {
    const incoming = [
      fakeFile("one.png", 1, 1),
      fakeFile("two.png", 2, 2),
      fakeFile("three.png", 3, 3),
    ];

    assert.deepEqual(
      selectNewInspirationFiles(incoming, [], 2).map((file) => file.name),
      ["one.png", "two.png"],
    );
    assert.deepEqual(selectNewInspirationFiles(incoming, [], 0), []);
  });
});

describe("createInspirationImageId", () => {
  it("never reuses an id when five files are added in one tick", () => {
    const ids = Array.from({ length: 5 }, () => createInspirationImageId());
    assert.equal(new Set(ids).size, 5);
    for (const id of ids) {
      assert.match(id, /^inspiration-/);
    }
  });
});

describe("filesFromDataTransfer", () => {
  it("prefers items.getAsFile so Safari does not reuse files[0]", () => {
    const first = { name: "first.png" } as File;
    const second = { name: "second.png" } as File;
    const files = filesFromDataTransfer({
      items: [
        { kind: "file", getAsFile: () => first },
        { kind: "file", getAsFile: () => second },
      ],
      files: [first, first],
    });

    assert.deepEqual(
      files.map((file) => file.name),
      ["first.png", "second.png"],
    );
  });

  it("falls back to Array.from(files) when items are empty", () => {
    const first = { name: "only.png" } as File;
    const files = filesFromDataTransfer({
      items: [],
      files: [first],
    });
    assert.deepEqual(
      files.map((file) => file.name),
      ["only.png"],
    );
  });
});
