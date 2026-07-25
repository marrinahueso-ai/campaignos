import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, sanitizeHrefUrl } from "@/lib/utils/html";

describe("escapeHtml", () => {
  it("escapes the standard HTML-sensitive characters", () => {
    assert.equal(
      escapeHtml(`<script>alert('x & y')</script>`),
      "&lt;script&gt;alert(&#39;x &amp; y&#39;)&lt;/script&gt;",
    );
  });
});

describe("sanitizeHrefUrl", () => {
  it("allows http/https/mailto URLs unchanged", () => {
    assert.equal(sanitizeHrefUrl("https://heyralli.com/invite/abc"), "https://heyralli.com/invite/abc");
    assert.equal(sanitizeHrefUrl("http://example.com"), "http://example.com");
    assert.equal(sanitizeHrefUrl("mailto:someone@example.com"), "mailto:someone@example.com");
  });

  it("allows relative paths and template placeholders unchanged", () => {
    assert.equal(sanitizeHrefUrl("/go/email-primary"), "/go/email-primary");
    assert.equal(sanitizeHrefUrl("{{ .ConfirmationURL }}"), "{{ .ConfirmationURL }}");
  });

  it("rejects javascript: URIs", () => {
    assert.equal(sanitizeHrefUrl("javascript:alert(1)"), "#");
    assert.equal(sanitizeHrefUrl("  javascript:alert(1)  "), "#");
    assert.equal(sanitizeHrefUrl("JavaScript:alert(1)"), "#");
  });

  it("rejects other dangerous schemes", () => {
    assert.equal(sanitizeHrefUrl("data:text/html,<script>alert(1)</script>"), "#");
    assert.equal(sanitizeHrefUrl("vbscript:msgbox(1)"), "#");
  });

  it("rejects an empty string", () => {
    assert.equal(sanitizeHrefUrl(""), "#");
    assert.equal(sanitizeHrefUrl("   "), "#");
  });
});
