import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("campaign file type groups", () => {
  const typeGroups = readSrc("../type-groups.ts");
  const filters = readSrc("../filters.ts");
  const actions = readSrc("../actions.ts");

  it("defines virtual type groups and inference helpers", () => {
    assert.match(typeGroups, /export type CampaignFileTypeGroup/);
    assert.match(typeGroups, /export function inferTypeGroup/);
    assert.match(typeGroups, /export function inferUploadCategory/);
    assert.match(typeGroups, /export function fileMatchesTypeGroup/);
    assert.match(typeGroups, /graphics/);
    assert.match(typeGroups, /photos/);
    assert.match(typeGroups, /documents/);
  });

  it("maps png artwork and graphic filenames to graphics", () => {
    assert.match(typeGroups, /category === "artwork"/);
    assert.match(typeGroups, /GRAPHIC_NAME_HINTS/);
  });

  it("infers upload categories from volunteer, vendor, and banner hints", () => {
    assert.match(typeGroups, /suggestDocumentCategory/);
    assert.match(typeGroups, /mapDocumentCategoryToLegacyCategory/);
  });

  it("wires typeGroup into filterCampaignFiles", () => {
    assert.match(filters, /typeGroup: "all"/);
    assert.match(filters, /fileMatchesTypeGroup/);
    assert.match(filters, /filters\.typeGroup !== "all"/);
  });

  it("uses auto category inference on upload when category is omitted", () => {
    assert.match(actions, /suggestDocumentCategory/);
    assert.match(actions, /rawCategory !== "auto"/);
    assert.match(actions, /uploadContext/);
  });
});
