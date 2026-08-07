import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const flyerHtml = readFileSync(
  join(process.cwd(), "public/create-with-ai-flyer.html"),
  "utf8",
);

describe("flyer composer UI source contract", () => {
  it("uses site Geist + Cormorant stack (same as dashboard chrome)", () => {
    assert.match(flyerHtml, /fonts\.googleapis\.com.*Geist|family=Geist/);
    assert.match(
      flyerHtml,
      /fonts\.googleapis\.com.*Cormorant|family=Cormorant/,
    );
    assert.match(flyerHtml, /--serif:\s*"Cormorant Garamond"/);
    assert.match(flyerHtml, /--sans:\s*"Geist"/);
    assert.match(flyerHtml, /button,\s*input,\s*textarea,\s*select/);
  });

  it("Preview stage exposes Social-matching art-edit pencil + Back to Inspiration", () => {
    assert.match(flyerHtml, /class="art-edit/);
    assert.match(flyerHtml, /title="Edit artwork"/);
    assert.match(flyerHtml, /function openEditForVersion/);
    assert.match(flyerHtml, /function artEditButtonHtml/);
    assert.match(
      flyerHtml,
      /id="btnPreviewBack"[^>]*data-goto="inputs"|data-goto="inputs"[^>]*id="btnPreviewBack"/,
    );
  });

  it("keeps Edit drawer + send-for-approval path (no one-off approval bypass)", () => {
    assert.match(flyerHtml, /function openEdit\s*\(/);
    assert.match(flyerHtml, /setView\("edit"\)/);
    assert.match(flyerHtml, /FLYER_SEND_APPROVAL_API/);
    assert.match(flyerHtml, /id="btnSendForApproval"/);
    assert.match(flyerHtml, /data-panel="edit"/);
  });

  it("exposes Brand Kit logo picker from Setup logos", () => {
    assert.match(flyerHtml, /id="brandLogoPicker"/);
    assert.match(flyerHtml, /function syncBrandLogoPicker/);
    assert.match(flyerHtml, /function resolveSelectedLogo/);
    assert.match(flyerHtml, /selectedLogoId/);
    assert.match(flyerHtml, /data-logo-id/);
  });

  it("exposes save options + per-event saved flyer load", () => {
    assert.match(flyerHtml, /FLYER_SAVED_API/);
    assert.match(flyerHtml, /function loadSavedFlyersForEvent/);
    assert.match(flyerHtml, /function openSavedFlyer/);
    assert.match(flyerHtml, /id="flyerSaveTitle"/);
    assert.match(flyerHtml, /id="savedFlyersPanel"/);
    assert.match(flyerHtml, /id="startSavedFlyers"/);
    assert.match(flyerHtml, /Save options/);
  });

  it("wires Browse Gallery to the host Background Library picker", () => {
    assert.match(flyerHtml, /id="browseGalleryBtn"/);
    assert.doesNotMatch(flyerHtml, /id="browseGalleryBtn"[^>]*\sdisabled/);
    assert.match(flyerHtml, /open-background-library/);
    assert.match(flyerHtml, /background-library-selected/);
    assert.match(flyerHtml, /function applyLibraryInspiration/);
    assert.match(flyerHtml, /inspirationPhotoSource === "library"/);
  });
});
