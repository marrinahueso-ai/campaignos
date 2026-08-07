import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BACKGROUND_LIBRARY_BULK_UPLOAD_MAX } from "../constants.ts";
import {
  collectBackgroundBulkUploadFiles,
  isBackgroundLibraryImageFile,
  titleFromBackgroundFilename,
} from "../upload-validation.ts";

function fakeFile(
  name: string,
  options: { size?: number; type?: string } = {},
): File {
  const size = options.size ?? 1024;
  const type = options.type ?? "image/png";
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

describe("background library upload validation", () => {
  it("accepts common image types under the size cap", () => {
    assert.equal(isBackgroundLibraryImageFile(fakeFile("a.png")), true);
    assert.equal(
      isBackgroundLibraryImageFile(fakeFile("a.jpg", { type: "image/jpeg" })),
      true,
    );
    assert.equal(
      isBackgroundLibraryImageFile(
        fakeFile("a.webp", { type: "image/webp" }),
      ),
      true,
    );
  });

  it("rejects empty, oversized, and non-image files", () => {
    assert.equal(
      isBackgroundLibraryImageFile(fakeFile("empty.png", { size: 0 })),
      false,
    );
    assert.equal(
      isBackgroundLibraryImageFile(
        fakeFile("big.png", { size: 13 * 1024 * 1024 }),
      ),
      false,
    );
    assert.equal(
      isBackgroundLibraryImageFile(
        fakeFile("notes.pdf", { type: "application/pdf" }),
      ),
      false,
    );
  });

  it("titles from filename without extension", () => {
    assert.equal(titleFromBackgroundFilename("Fall Leaves.png"), "Fall Leaves");
    assert.equal(titleFromBackgroundFilename(""), "Library background");
  });

  it("collects FormData files and enforces the bulk cap", () => {
    const form = new FormData();
    form.append("files", fakeFile("one.png"));
    form.append("files", fakeFile("two.jpg", { type: "image/jpeg" }));
    const ok = collectBackgroundBulkUploadFiles(form);
    assert.equal(ok.error, null);
    assert.equal(ok.files.length, 2);

    const tooMany = new FormData();
    for (let i = 0; i < BACKGROUND_LIBRARY_BULK_UPLOAD_MAX + 1; i += 1) {
      tooMany.append("files", fakeFile(`n-${i}.png`));
    }
    const capped = collectBackgroundBulkUploadFiles(tooMany);
    assert.match(capped.error ?? "", /at most/);
    assert.equal(capped.files.length, 0);
  });

  it("rejects bulk uploads that exceed the total FormData budget", () => {
    const form = new FormData();
    // Four ~11MB files stay under the per-file cap but blow the 40MB total.
    const chunk = 11 * 1024 * 1024;
    for (let i = 0; i < 4; i += 1) {
      form.append("files", fakeFile(`big-${i}.png`, { size: chunk }));
    }
    const result = collectBackgroundBulkUploadFiles(form);
    assert.match(result.error ?? "", /total more than/);
    assert.equal(result.files.length, 0);
  });
});
