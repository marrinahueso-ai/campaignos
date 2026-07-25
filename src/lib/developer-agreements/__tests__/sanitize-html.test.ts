import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeAgreementHtml } from "@/lib/developer-agreements/sanitize-html";

describe("sanitizeAgreementHtml", () => {
  it("strips <script> tags", () => {
    const out = sanitizeAgreementHtml("<p>Hi</p><script>alert(1)</script>");
    assert.equal(out, "<p>Hi</p>");
  });

  it("strips inline event handler attributes", () => {
    const out = sanitizeAgreementHtml('<img src="x" onerror="alert(1)">');
    assert.ok(!out.includes("onerror"));
  });

  it("strips javascript: URIs from links", () => {
    const out = sanitizeAgreementHtml('<a href="javascript:alert(1)">click</a>');
    assert.ok(!out.includes("javascript:"));
  });

  it("keeps ordinary formatting markup intact", () => {
    const out = sanitizeAgreementHtml(
      "<h1>Agreement</h1><p>Some <strong>bold</strong> text.</p><table><tr><td>Cell</td></tr></table>",
    );
    assert.ok(out.includes("<h1>Agreement</h1>"));
    assert.ok(out.includes("<strong>bold</strong>"));
    assert.ok(out.includes("<table>"));
  });
});
