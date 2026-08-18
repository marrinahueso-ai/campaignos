import type { FlyerInspirationPhotoSource } from "@/lib/flyer-composer/inspiration-source";

export type FlyerStatus =
  | "draft"
  | "needs_approval"
  | "changes_requested"
  | "approved";

export const FLYER_STATUSES: FlyerStatus[] = [
  "draft",
  "needs_approval",
  "changes_requested",
  "approved",
];

export type FlyerPrintSize = "letter" | "half";

export type FlyerVersion = {
  id: string;
  imageUrl: string;
  createdAt: number;
};

export type FlyerComposerState = {
  aiDirection?: string;
  datesEvents?: string;
  /** Time / directions slot. */
  directions?: string;
  location?: string;
  ctaUrl?: string;
  orgName?: string;
  headline?: string;
  schoolYear?: string;
  ctaLabel?: string;
  footerLine?: string;
  qrUrl?: string;
  qrCaption?: string;
  qrEnabled?: boolean;
  brandEnabled?: boolean;
  selectedLogoId?: string | null;
  inspirationPhotoUrl?: string | null;
  inspirationPhotoSource?: FlyerInspirationPhotoSource | null;
  inspirationPhotoLabel?: string | null;
  /** Image-only reference to a prior flyer. */
  previousFlyerUrl?: string | null;
  versions?: FlyerVersion[];
  activeVersionId?: string | null;
  editDirection?: string;
};

export interface FlyerRow {
  id: string;
  organization_id: string;
  event_id: string | null;
  title: string;
  status: FlyerStatus;
  print_size: FlyerPrintSize;
  composer_state: unknown;
  preview_image_url: string | null;
  approval_scheduling_item_id: string | null;
  change_request_note: string | null;
  created_by: string | null;
  updated_by: string | null;
  submitted_by: string | null;
  approved_by: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Flyer {
  id: string;
  organizationId: string;
  eventId: string | null;
  title: string;
  status: FlyerStatus;
  printSize: FlyerPrintSize;
  composerState: FlyerComposerState;
  previewImageUrl: string | null;
  approvalSchedulingItemId: string | null;
  changeRequestNote: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  submittedBy: string | null;
  approvedBy: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
