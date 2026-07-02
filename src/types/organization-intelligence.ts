export type WritingStyle =
  | "friendly"
  | "professional"
  | "enthusiastic"
  | "warm"
  | "concise"
  | "formal";

export type DefaultCtaStyle =
  | "direct"
  | "soft_invite"
  | "question"
  | "link_forward"
  | "volunteer_focused";

export type EmojiUsage = "none" | "minimal" | "moderate" | "frequent";

export type NewsletterLength = "short" | "medium" | "long";

export type TrainingDocumentType =
  | "pdf"
  | "docx"
  | "newsletter"
  | "facebook_export"
  | "website_article"
  | "principal_letter"
  | "canva_pdf";

export type TrainingUploadStatus = "registered" | "uploaded" | "failed";

export interface OrganizationAiProfile {
  id: string;
  organizationId: string;
  organizationVoice: string | null;
  writingStyle: WritingStyle | null;
  communicationPreferences: string | null;
  channelPreferences: string | null;
  defaultCtaStyle: DefaultCtaStyle | null;
  emojiUsage: EmojiUsage | null;
  newsletterLength: NewsletterLength | null;
  facebookTone: string | null;
  instagramTone: string | null;
  websiteTone: string | null;
  principalMessagingStyle: string | null;
  audienceDefaults: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAiProfileRow {
  id: string;
  organization_id: string;
  organization_voice: string | null;
  writing_style: WritingStyle | null;
  communication_preferences: string | null;
  channel_preferences: string | null;
  default_cta_style: DefaultCtaStyle | null;
  emoji_usage: EmojiUsage | null;
  newsletter_length: NewsletterLength | null;
  facebook_tone: string | null;
  instagram_tone: string | null;
  website_tone: string | null;
  principal_messaging_style: string | null;
  audience_defaults: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationAiProfileInput {
  organizationVoice: string | null;
  writingStyle: WritingStyle | null;
  communicationPreferences: string | null;
  channelPreferences: string | null;
  defaultCtaStyle: DefaultCtaStyle | null;
  emojiUsage: EmojiUsage | null;
  newsletterLength: NewsletterLength | null;
  facebookTone: string | null;
  instagramTone: string | null;
  websiteTone: string | null;
  principalMessagingStyle: string | null;
  audienceDefaults: string | null;
}

export interface OrganizationTrainingDocument {
  id: string;
  organizationId: string;
  title: string;
  documentType: TrainingDocumentType;
  filename: string;
  fileSize: number;
  mimeType: string | null;
  storagePath: string | null;
  uploadStatus: TrainingUploadStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationTrainingDocumentRow {
  id: string;
  organization_id: string;
  title: string;
  document_type: TrainingDocumentType;
  filename: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string | null;
  upload_status: TrainingUploadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationIntelligenceData {
  profile: OrganizationAiProfile | null;
  trainingDocuments: OrganizationTrainingDocument[];
}
