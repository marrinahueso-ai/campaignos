import type {
  Vendor,
  VendorActivityLog,
  VendorCategory,
  VendorCategoryRow,
  VendorContact,
  VendorContactRow,
  VendorDocument,
  VendorDocumentRow,
  VendorEventAssignment,
  VendorEventAssignmentRow,
  VendorNote,
  VendorNoteRow,
  VendorRow,
  VendorStatus,
  VendorAssignmentStatus,
  VendorPaymentStatus,
  VendorDocumentType,
} from "@/types/vendors";

const VALID_VENDOR_STATUSES = new Set<VendorStatus>([
  "active",
  "pending",
  "blocked",
  "archived",
]);

const VALID_ASSIGNMENT_STATUSES = new Set<VendorAssignmentStatus>([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export function mapVendorCategoryRow(row: VendorCategoryRow): VendorCategory {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
  };
}

export function mapVendorRow(row: VendorRow): Vendor {
  const status = VALID_VENDOR_STATUSES.has(row.status) ? row.status : "active";

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    website: row.website,
    email: row.email,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    categoryId: row.category_id,
    status,
    isFavorite: row.is_favorite,
    notesSummary: row.notes_summary,
    logoPath: row.logo_path ?? null,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVendorContactRow(row: VendorContactRow): VendorContact {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vendorId: row.vendor_id,
    name: row.name,
    title: row.title,
    email: row.email,
    phone: row.phone,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

export function mapVendorAssignmentRow(
  row: VendorEventAssignmentRow,
): VendorEventAssignment {
  const assignmentStatus = VALID_ASSIGNMENT_STATUSES.has(row.assignment_status)
    ? row.assignment_status
    : "pending";

  return {
    id: row.id,
    organizationId: row.organization_id,
    vendorId: row.vendor_id,
    eventId: row.event_id,
    assignmentStatus,
    contractAmount: row.contract_amount,
    contractCurrency: row.contract_currency,
    paymentStatus: row.payment_status,
    serviceDescription: row.service_description,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVendorDocumentRow(row: VendorDocumentRow): VendorDocument {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vendorId: row.vendor_id,
    eventId: row.event_id,
    documentType: row.document_type as VendorDocumentType,
    name: row.name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
  };
}

export function mapVendorNoteRow(row: VendorNoteRow): VendorNote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vendorId: row.vendor_id,
    content: row.content,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVendorActivityLogRow(row: {
  id: string;
  organization_id: string;
  vendor_id: string;
  event_id: string | null;
  action: string;
  details: string | null;
  actor_name: string | null;
  created_at: string;
}): VendorActivityLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vendorId: row.vendor_id,
    eventId: row.event_id,
    action: row.action,
    details: row.details,
    actorName: row.actor_name,
    createdAt: row.created_at,
  };
}
