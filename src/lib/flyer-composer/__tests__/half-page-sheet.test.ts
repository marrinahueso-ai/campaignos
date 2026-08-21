import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HALF_PAGE_SHEET_COPIES,
  buildHalfPagePrintHtml,
  halfPageSheetLayout,
} from "../half-page-sheet.ts";

describe("half-page letter sheet (export only)", () => {
  it("stacks exactly two halves to fill a Letter page", () => {
    const layout = halfPageSheetLayout(1700);
    assert.equal(layout.copies, HALF_PAGE_SHEET_COPIES);
    assert.equal(layout.copies, 2);
    assert.equal(
      layout.halfHeights[0] + layout.halfHeights[1],
      layout.sheetHeightPx,
    );
    assert.equal(layout.sheetHeightPx, Math.round((1700 * 11) / 8.5));
  });

  it("builds print HTML with two copies of the same image on Letter", () => {
    const html = buildHalfPagePrintHtml("https://cdn.example/half.png");
    assert.match(html, /size:\s*letter/);
    assert.match(html, /8\.5in/);
    assert.match(html, /5\.5in/);
    assert.equal(
      (html.match(/https:\/\/cdn\.example\/half\.png/g) ?? []).length,
      2,
    );
  });
});
