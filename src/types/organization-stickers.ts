export type OrganizationStickerRow = {
  id: string;
  organization_id: string;
  label: string;
  storage_path: string;
  public_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationSticker = {
  id: string;
  organizationId: string;
  label: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};
