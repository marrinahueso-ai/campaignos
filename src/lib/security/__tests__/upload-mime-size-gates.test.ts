import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  fileExtensionOf,
  resolveSafeUploadContentType,
} from "@/lib/uploads/safe-content-type";
import {
  isAllowedVendorDocument,
  isAllowedVendorLogo,
  MAX_VENDOR_DOCUMENT_BYTES,
  MAX_VENDOR_LOGO_BYTES,
  resolveVendorDocumentContentType,
  resolveVendorLogoContentType,
} from "@/lib/vendors/storage";
import { ALLOWED_TRAINING_FILE_EXTENSIONS } from "@/lib/organization-intelligence/constants";
import { parseTrainingDocumentInput } from "@/lib/organization-intelligence/validation";

/**
 * calendar-import/mutations.ts transitively imports next/headers-style
 * "server-only", which can't be require()'d outside the Next.js build — so
 * this guard reads its source directly instead of importing the module.
 */
function readCalendarImportMutationsSrc(): string {
  const path = fileURLToPath(
    new URL("../../calendar-import/mutations.ts", import.meta.url),
  );
  return readFileSync(path, "utf8");
}

/**
 * Security regression guard: several public/private-bucket upload paths
 * (calendar import, vendor documents/logos, Training Library) either had no
 * byte-size cap or trusted the client-supplied `File.type` as the stored
 * Storage Content-Type. Both are launch-readiness gaps: an unbounded upload
 * is a resource-exhaustion/cost risk, and a client-controlled Content-Type
 * lets a renamed/spoofed file be served back as `text/html` (stored XSS) or
 * another script-capable type. These tests pin the fix so it can't quietly
 * regress.
 */
describe("upload validation — client-MIME-trust and size-cap gates", () => {
  it("resolveSafeUploadContentType derives Content-Type from the extension, not the caller's claimed MIME", () => {
    // Even if the caller passes a spoofed/irrelevant MIME type, the resolver
    // never looks at it — only the filename extension determines the result.
    assert.equal(
      resolveSafeUploadContentType("report.csv", [".csv"]),
      "text/csv",
    );
    assert.equal(
      resolveSafeUploadContentType("event.ics", [".ics"]),
      "text/calendar",
    );
    assert.equal(resolveSafeUploadContentType("notes.txt", [".txt"]), "text/plain");
    assert.equal(
      resolveSafeUploadContentType("data.json", [".json"]),
      "application/json",
    );
    assert.equal(resolveSafeUploadContentType("bundle.zip", [".zip"]), "application/zip");
  });

  it("resolveSafeUploadContentType rejects an extension outside the allow-list, e.g. .html", () => {
    assert.equal(
      resolveSafeUploadContentType("evil.html", [".pdf", ".docx", ".csv"]),
      null,
    );
  });

  describe("vendor documents/logos", () => {
    it("rejects a spoofed vendor document (.html renamed with a PDF MIME type)", () => {
      const file = new File(["<script>alert(1)</script>"], "invoice.html", {
        type: "application/pdf",
      });
      assert.equal(isAllowedVendorDocument(file), false);
      assert.equal(resolveVendorDocumentContentType(file.name), null);
    });

    it("accepts a real vendor document and derives Content-Type from its extension", () => {
      const file = new File(["%PDF-1.4"], "contract.pdf", {
        type: "application/octet-stream", // deliberately wrong/irrelevant client MIME
      });
      assert.equal(isAllowedVendorDocument(file), true);
      assert.equal(resolveVendorDocumentContentType(file.name), "application/pdf");
    });

    it("rejects a spoofed vendor logo (.html renamed with an image MIME type)", () => {
      const file = new File(["<script>alert(1)</script>"], "logo.html", {
        type: "image/png",
      });
      assert.equal(isAllowedVendorLogo(file), false);
      assert.equal(resolveVendorLogoContentType(file.name), null);
    });

    it("enforces byte-size ceilings for vendor documents and logos", () => {
      assert.equal(MAX_VENDOR_DOCUMENT_BYTES, 25 * 1024 * 1024);
      assert.equal(MAX_VENDOR_LOGO_BYTES, 5 * 1024 * 1024);
    });
  });

  describe("calendar import uploads", () => {
    it("enforces a byte-size ceiling before upload", () => {
      const src = readCalendarImportMutationsSrc();
      assert.match(src, /MAX_CALENDAR_IMPORT_FILE_BYTES/);
      assert.match(
        src,
        /file\.size > MAX_CALENDAR_IMPORT_FILE_BYTES/,
      );
    });

    it("derives Content-Type from the extension allow-list, not file.type", () => {
      const src = readCalendarImportMutationsSrc();
      assert.match(
        src,
        /resolveSafeUploadContentType\(\s*\n?\s*file\.name,\s*\n?\s*CALENDAR_UPLOAD_EXTENSIONS,?\s*\n?\s*\)/,
      );
      assert.doesNotMatch(src, /contentType:\s*file\.type/);
    });
  });

  describe("Training Library uploads", () => {
    it("excludes .html from the allowed extensions", () => {
      assert.ok(!ALLOWED_TRAINING_FILE_EXTENSIONS.includes(".html" as never));
      assert.ok(ALLOWED_TRAINING_FILE_EXTENSIONS.includes(".pdf"));
    });

    function formDataWith(file: File): FormData {
      const fd = new FormData();
      fd.set("title", "Sample");
      fd.set("documentType", "pdf");
      fd.set("trainingFile", file);
      return fd;
    }

    it("rejects a spoofed training upload (.html renamed with a text/plain MIME type)", () => {
      const file = new File(["<script>alert(1)</script>"], "notes.html", {
        type: "text/plain",
      });
      const result = parseTrainingDocumentInput(formDataWith(file));
      assert.ok("error" in result, "expected validation to reject .html upload");
    });

    it("rejects an oversized training upload", () => {
      const big = new File([new Uint8Array(26 * 1024 * 1024)], "big.pdf", {
        type: "application/pdf",
      });
      const result = parseTrainingDocumentInput(formDataWith(big));
      assert.ok("error" in result, "expected validation to reject oversized upload");
    });

    it("accepts a valid PDF training upload regardless of the claimed MIME type", () => {
      const file = new File(["%PDF-1.4"], "handbook.pdf", {
        type: "application/octet-stream",
      });
      const result = parseTrainingDocumentInput(formDataWith(file));
      assert.ok(!("error" in result), "expected a valid .pdf upload to pass");
    });
  });

  it("fileExtensionOf lower-cases and handles no-extension filenames", () => {
    assert.equal(fileExtensionOf("Report.PDF"), ".pdf");
    assert.equal(fileExtensionOf("noextension"), "");
  });
});
