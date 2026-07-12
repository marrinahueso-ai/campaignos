export const VENDOR_DOCUMENTS_BUCKET = "vendor-documents";

export const VENDOR_PAGE_SIZE = 10;

export const VENDOR_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "blocked", label: "Blocked" },
  { value: "archived", label: "Archived" },
] as const;

export const VENDOR_DIRECTORY_TABS = [
  { id: "all" as const, label: "All Vendors" },
  { id: "favorites" as const, label: "Favorites" },
  { id: "past" as const, label: "Past Vendors" },
  { id: "pending" as const, label: "Pending" },
  { id: "blocked" as const, label: "Blocked" },
];

export const VENDOR_ASSIGNMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const VENDOR_DOCUMENT_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "invoice", label: "Invoice" },
  { value: "w9", label: "W-9" },
  { value: "insurance", label: "Insurance" },
  { value: "proposal", label: "Proposal" },
  { value: "other", label: "Other" },
] as const;

export const MAX_VENDOR_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_VENDOR_DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".png",
  ".jpg",
  ".jpeg",
]);

export const VENDORS_MIGRATION = "053_vendor_directory.sql";
