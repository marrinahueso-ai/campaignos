import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapDocumentCategoryToLegacyCategory,
  matchDocumentCategoryFromFilename,
  suggestDocumentCategory,
} from "../document-category.ts";

describe("document category keyword mapping", () => {
  it("maps contract, agreement, and waiver keywords", () => {
    assert.equal(
      matchDocumentCategoryFromFilename("vendor-contract-2026.pdf"),
      "contract_or_agreement",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("Parent_Agreement.docx"),
      "contract_or_agreement",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("field-trip-waiver.pdf"),
      "contract_or_agreement",
    );
  });

  it("maps meeting keywords to agenda vs minutes", () => {
    assert.equal(
      matchDocumentCategoryFromFilename("PTA-meeting-agenda.pdf"),
      "meeting_agenda",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("board-minutes-jan.pdf"),
      "meeting_notes_or_minutes",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("meeting-notes.docx"),
      "meeting_notes_or_minutes",
    );
  });

  it("maps financial keywords", () => {
    assert.equal(
      matchDocumentCategoryFromFilename("catering-invoice.pdf"),
      "invoice_or_receipt",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("supply-receipt.jpg"),
      "invoice_or_receipt",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("dj-quote.pdf"),
      "quote_or_estimate",
    );
  });

  it("maps volunteer, sponsor, and vendor keywords", () => {
    assert.equal(
      matchDocumentCategoryFromFilename("volunteer-signup.pdf"),
      "volunteer_document",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("setup-instructions.docx"),
      "volunteer_document",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("sponsor-logo.png"),
      "sponsor_document",
    );
    assert.equal(
      matchDocumentCategoryFromFilename("vendor-list.xlsx"),
      "vendor_document",
    );
  });

  it("is case-insensitive", () => {
    assert.equal(
      matchDocumentCategoryFromFilename("CONTRACT-final.PDF"),
      "contract_or_agreement",
    );
  });
});

describe("document category upload context", () => {
  it("defaults Volunteers tab uploads to Volunteer Document", () => {
    assert.equal(
      suggestDocumentCategory("notes.pdf", "application/pdf", "volunteers"),
      "volunteer_document",
    );
  });

  it("defaults vendor surface uploads to Vendor Document", () => {
    assert.equal(
      suggestDocumentCategory("info.pdf", "application/pdf", "vendors"),
      "vendor_document",
    );
  });

  it("defaults Tasks and Files surfaces to General Document", () => {
    assert.equal(
      suggestDocumentCategory("notes.pdf", "application/pdf", "tasks"),
      "general_document",
    );
    assert.equal(
      suggestDocumentCategory("notes.pdf", "application/pdf", "event_files"),
      "general_document",
    );
    assert.equal(
      suggestDocumentCategory("notes.pdf", "application/pdf", "org_files"),
      "general_document",
    );
  });

  it("prefers filename keywords over upload context", () => {
    assert.equal(
      suggestDocumentCategory("invoice.pdf", "application/pdf", "volunteers"),
      "invoice_or_receipt",
    );
  });
});

describe("legacy category mapping", () => {
  it("maps document categories onto existing enum values", () => {
    assert.equal(
      mapDocumentCategoryToLegacyCategory(
        "contract_or_agreement",
        "contract.pdf",
        "application/pdf",
      ),
      "contract",
    );
    assert.equal(
      mapDocumentCategoryToLegacyCategory(
        "volunteer_document",
        "signup.pdf",
        "application/pdf",
      ),
      "volunteer_form",
    );
    assert.equal(
      mapDocumentCategoryToLegacyCategory(
        "vendor_document",
        "vendor.pdf",
        "application/pdf",
      ),
      "vendor_list",
    );
    assert.equal(
      mapDocumentCategoryToLegacyCategory(
        "sponsor_document",
        "logo.png",
        "image/png",
      ),
      "artwork",
    );
  });
});
