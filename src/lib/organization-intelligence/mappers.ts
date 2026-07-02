import type {
  OrganizationAiProfile,
  OrganizationAiProfileInput,
  OrganizationAiProfileRow,
  OrganizationTrainingDocument,
  OrganizationTrainingDocumentRow,
  TrainingDocumentType,
} from "@/types/organization-intelligence";

export function mapAiProfileRow(row: OrganizationAiProfileRow): OrganizationAiProfile {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationVoice: row.organization_voice,
    writingStyle: row.writing_style,
    communicationPreferences: row.communication_preferences,
    channelPreferences: row.channel_preferences,
    defaultCtaStyle: row.default_cta_style,
    emojiUsage: row.emoji_usage,
    newsletterLength: row.newsletter_length,
    facebookTone: row.facebook_tone,
    instagramTone: row.instagram_tone,
    websiteTone: row.website_tone,
    principalMessagingStyle: row.principal_messaging_style,
    audienceDefaults: row.audience_defaults,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAiProfileUpsert(
  organizationId: string,
  input: OrganizationAiProfileInput,
) {
  const now = new Date().toISOString();

  return {
    organization_id: organizationId,
    organization_voice: input.organizationVoice,
    writing_style: input.writingStyle,
    communication_preferences: input.communicationPreferences,
    channel_preferences: input.channelPreferences,
    default_cta_style: input.defaultCtaStyle,
    emoji_usage: input.emojiUsage,
    newsletter_length: input.newsletterLength,
    facebook_tone: input.facebookTone,
    instagram_tone: input.instagramTone,
    website_tone: input.websiteTone,
    principal_messaging_style: input.principalMessagingStyle,
    audience_defaults: input.audienceDefaults,
    updated_at: now,
  };
}

export function mapTrainingDocumentRow(
  row: OrganizationTrainingDocumentRow,
): OrganizationTrainingDocument {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    documentType: row.document_type,
    filename: row.filename,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    uploadStatus: row.upload_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getTrainingDocumentTypeLabel(type: TrainingDocumentType): string {
  const labels: Record<TrainingDocumentType, string> = {
    pdf: "PDF",
    docx: "DOCX",
    newsletter: "Newsletter",
    facebook_export: "Facebook Export",
    website_article: "Website Article",
    principal_letter: "Principal Letter",
    canva_pdf: "Canva PDF",
  };
  return labels[type];
}
