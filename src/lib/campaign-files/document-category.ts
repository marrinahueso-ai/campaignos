import { detectFileType } from "@/lib/campaign-files/file-type";
import type {
  CampaignFileCategory,
  DocumentCategory,
  FileUploadContext,
} from "@/types/campaign-files";

export const DOCUMENT_CATEGORY_VALUES: DocumentCategory[] = [
  "contract_or_agreement",
  "meeting_agenda",
  "meeting_notes_or_minutes",
  "invoice_or_receipt",
  "quote_or_estimate",
  "volunteer_document",
  "vendor_document",
  "sponsor_document",
  "financial_document",
  "general_document",
];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contract_or_agreement: "Contract or Agreement",
  meeting_agenda: "Meeting Agenda",
  meeting_notes_or_minutes: "Meeting Notes or Minutes",
  invoice_or_receipt: "Invoice or Receipt",
  quote_or_estimate: "Quote or Estimate",
  volunteer_document: "Volunteer Document",
  vendor_document: "Vendor Document",
  sponsor_document: "Sponsor Document",
  financial_document: "Financial Document",
  general_document: "General Document",
};

const VALID_DOCUMENT_CATEGORIES = new Set<string>(DOCUMENT_CATEGORY_VALUES);

export function isDocumentCategory(value: string | null | undefined): value is DocumentCategory {
  return Boolean(value && VALID_DOCUMENT_CATEGORIES.has(value));
}

export function documentCategoryLabel(
  category: DocumentCategory | null | undefined,
): string {
  if (!category) return DOCUMENT_CATEGORY_LABELS.general_document;
  return DOCUMENT_CATEGORY_LABELS[category] ?? DOCUMENT_CATEGORY_LABELS.general_document;
}

/** Keyword rules — first match wins (case-insensitive filename). */
const KEYWORD_RULES: { pattern: RegExp; category: DocumentCategory }[] = [
  { pattern: /\bagenda\b/i, category: "meeting_agenda" },
  {
    pattern: /\b(minutes|meeting notes|meeting_notes)\b/i,
    category: "meeting_notes_or_minutes",
  },
  {
    pattern: /\b(contract|agreement|waiver)\b/i,
    category: "contract_or_agreement",
  },
  { pattern: /\bquote\b/i, category: "quote_or_estimate" },
  { pattern: /\b(invoice|receipt)\b/i, category: "invoice_or_receipt" },
  {
    pattern: /\b(volunteer|signup|sign-up|sign up|instructions)\b/i,
    category: "volunteer_document",
  },
  { pattern: /\b(logo|sponsor)\b/i, category: "sponsor_document" },
  { pattern: /\b(vendor|supplier)\b/i, category: "vendor_document" },
  {
    pattern: /\b(budget|expense|financial|finance)\b/i,
    category: "financial_document",
  },
];

function contextDefaultCategory(context: FileUploadContext): DocumentCategory {
  switch (context) {
    case "volunteers":
      return "volunteer_document";
    case "vendors":
      return "vendor_document";
    case "tasks":
    case "event_files":
    case "org_files":
    case "general":
    default:
      return "general_document";
  }
}

/** Treat hyphens, underscores, and dots as word breaks for keyword scans. */
function keywordScanText(filename: string): string {
  return filename.toLowerCase().replace(/[-_.]+/g, " ");
}

export function matchDocumentCategoryFromFilename(
  filename: string,
): DocumentCategory | null {
  const scanText = keywordScanText(filename);
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(scanText)) {
      return rule.category;
    }
  }
  return null;
}

export function suggestDocumentCategory(
  filename: string,
  mimeType?: string | null,
  context: FileUploadContext = "general",
): DocumentCategory {
  const fromKeywords = matchDocumentCategoryFromFilename(filename);
  if (fromKeywords) {
    return fromKeywords;
  }

  return contextDefaultCategory(context);
}

export function mapDocumentCategoryToLegacyCategory(
  documentCategory: DocumentCategory,
  filename: string,
  mimeType?: string | null,
): CampaignFileCategory {
  const type = detectFileType(filename, mimeType);

  switch (documentCategory) {
    case "contract_or_agreement":
      return "contract";
    case "volunteer_document":
      return "volunteer_form";
    case "vendor_document":
      return "vendor_list";
    case "sponsor_document":
      if (type === "png" || type === "jpg") {
        return "artwork";
      }
      return "other";
    case "meeting_agenda":
    case "meeting_notes_or_minutes":
    case "invoice_or_receipt":
    case "quote_or_estimate":
    case "financial_document":
    case "general_document":
    default:
      if (type === "png" || type === "jpg") {
        if (/\b(flyer|banner|poster|graphic|social|artwork)\b/i.test(filename)) {
          return "artwork";
        }
      }
      if (/\bflyer\b/i.test(filename)) {
        return "flyer";
      }
      return "other";
  }
}

export function parseFileUploadContext(raw: string | null | undefined): FileUploadContext {
  switch (raw) {
    case "volunteers":
    case "tasks":
    case "vendors":
    case "event_files":
    case "org_files":
      return raw;
    default:
      return "general";
  }
}
