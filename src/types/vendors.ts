export type VendorStatus = "active" | "pending" | "blocked" | "archived";

export type VendorAssignmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type VendorPaymentStatus = "unpaid" | "partial" | "paid" | "waived";

export type VendorDocumentType =
  | "contract"
  | "invoice"
  | "w9"
  | "insurance"
  | "proposal"
  | "other";

export type VendorDirectoryTab =
  | "all"
  | "favorites"
  | "past"
  | "pending"
  | "blocked";

export interface VendorCategory {
  id: string;
  organizationId: string | null;
  name: string;
  slug: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
}

export interface VendorCategoryRow {
  id: string;
  organization_id: string | null;
  name: string;
  slug: string;
  color: string;
  is_system: boolean;
  sort_order: number;
}

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  categoryId: string | null;
  status: VendorStatus;
  isFavorite: boolean;
  notesSummary: string | null;
  logoPath: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRow {
  id: string;
  organization_id: string;
  name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  category_id: string | null;
  status: VendorStatus;
  is_favorite: boolean;
  notes_summary: string | null;
  logo_path?: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorContact {
  id: string;
  organizationId: string;
  vendorId: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface VendorContactRow {
  id: string;
  organization_id: string;
  vendor_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface VendorEventAssignment {
  id: string;
  organizationId: string;
  vendorId: string;
  eventId: string;
  assignmentStatus: VendorAssignmentStatus;
  contractAmount: number | null;
  contractCurrency: string;
  paymentStatus: VendorPaymentStatus;
  serviceDescription: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorEventAssignmentRow {
  id: string;
  organization_id: string;
  vendor_id: string;
  event_id: string;
  assignment_status: VendorAssignmentStatus;
  contract_amount: number | null;
  contract_currency: string;
  payment_status: VendorPaymentStatus;
  service_description: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorDocument {
  id: string;
  organizationId: string;
  vendorId: string;
  eventId: string | null;
  documentType: VendorDocumentType;
  name: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByName: string | null;
  createdAt: string;
}

export interface VendorDocumentRow {
  id: string;
  organization_id: string;
  vendor_id: string;
  event_id: string | null;
  document_type: VendorDocumentType;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by_name: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface VendorNote {
  id: string;
  organizationId: string;
  vendorId: string;
  content: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorNoteRow {
  id: string;
  organization_id: string;
  vendor_id: string;
  content: string;
  created_by_name: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorActivityLog {
  id: string;
  organizationId: string;
  vendorId: string;
  eventId: string | null;
  action: string;
  details: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface VendorEventSummary {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  assignmentStatus: VendorAssignmentStatus;
  assignmentId: string;
}

export interface VendorDirectoryRow {
  vendor: Vendor;
  category: VendorCategory | null;
  primaryContact: VendorContact | null;
  latestAssignment: VendorEventSummary | null;
  assignmentCount: number;
  eventIds: string[];
}

export interface VendorDirectorySummary {
  totalVendors: number;
  confirmedThisYear: number;
  upcomingEventsWithVendors: number;
  favoriteVendors: number;
}

export interface VendorDirectoryFilters {
  search: string;
  eventId: string;
  categoryId: string;
  status: string;
  tab: VendorDirectoryTab;
}

export interface VendorDirectoryPageData {
  vendors: VendorDirectoryRow[];
  categories: VendorCategory[];
  events: Array<{ id: string; title: string; date: string }>;
  summary: VendorDirectorySummary;
  canWrite: boolean;
  canManage: boolean;
}

export interface VendorDetailData {
  vendor: Vendor;
  category: VendorCategory | null;
  contacts: VendorContact[];
  assignments: VendorEventSummary[];
  notes: VendorNote[];
  documents: VendorDocument[];
  activityLogs: VendorActivityLog[];
  canWrite: boolean;
  canManage: boolean;
}

export interface CreateVendorInput {
  name: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  categoryId?: string | null;
  status?: VendorStatus;
  contactName?: string | null;
  contactTitle?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  eventId?: string | null;
  assignmentStatus?: VendorAssignmentStatus;
}

export interface UpdateVendorInput {
  name?: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  categoryId?: string | null;
  status?: VendorStatus;
  notesSummary?: string | null;
}

export interface EventVendorRow {
  assignmentId: string;
  vendor: Vendor;
  category: VendorCategory | null;
  primaryContact: VendorContact | null;
  assignmentStatus: VendorAssignmentStatus;
  /** Signed URL for logo display; resolved when loading event vendors. */
  logoUrl: string | null;
}

export interface EventVendorsData {
  vendors: EventVendorRow[];
  canWrite: boolean;
}
