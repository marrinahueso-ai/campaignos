import assert from "node:assert/strict";
import test from "node:test";
import { buildHomepageShareDocumentHtml } from "@/lib/homepage-composer/share-document";
import {
  homepageComposerSharePath,
  homepageComposerShareUrl,
} from "@/lib/homepage-composer/share-url";

test("homepageComposerSharePath encodes token safely", () => {
  assert.equal(
    homepageComposerSharePath("abc+def/token"),
    "/share/homepage/abc%2Bdef%2Ftoken",
  );
});

test("homepageComposerShareUrl builds absolute link", () => {
  assert.equal(
    homepageComposerShareUrl("https://heyralli.com", "tok123"),
    "https://heyralli.com/share/homepage/tok123",
  );
});

test("buildHomepageShareDocumentHtml wraps preview body with print toolbar", () => {
  const html = buildHomepageShareDocumentHtml({
    title: "Fall Fest — Homepage preview",
    bodyHtml: "<div class=\"ees-home-wrap\">Preview</div>",
  });
  assert.match(html, /Save as PDF/);
  assert.match(html, /data-share-print/);
  assert.match(html, /Preview<\/div>/);
  assert.match(html, /@media print/);
});
