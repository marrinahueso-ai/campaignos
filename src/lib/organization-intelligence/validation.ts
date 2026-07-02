import {
  ALLOWED_TRAINING_MIME_TYPES,
  CTA_STYLES,
  EMOJI_USAGE_OPTIONS,
  MAX_PROFILE_TEXT_LENGTH,
  MAX_TONE_LENGTH,
  MAX_TRAINING_FILE_BYTES,
  MAX_TRAINING_NOTES_LENGTH,
  MAX_TRAINING_TITLE_LENGTH,
  NEWSLETTER_LENGTH_OPTIONS,
  TRAINING_DOCUMENT_TYPES,
  WRITING_STYLES,
} from "@/lib/organization-intelligence/constants";
import type {
  DefaultCtaStyle,
  EmojiUsage,
  NewsletterLength,
  OrganizationAiProfileInput,
  TrainingDocumentType,
  WritingStyle,
} from "@/types/organization-intelligence";

const WRITING_STYLE_VALUES = new Set(WRITING_STYLES.map((entry) => entry.value));
const CTA_STYLE_VALUES = new Set(CTA_STYLES.map((entry) => entry.value));
const EMOJI_USAGE_VALUES = new Set(EMOJI_USAGE_OPTIONS.map((entry) => entry.value));
const NEWSLETTER_LENGTH_VALUES = new Set(
  NEWSLETTER_LENGTH_OPTIONS.map((entry) => entry.value),
);
const DOCUMENT_TYPE_VALUES = new Set(
  TRAINING_DOCUMENT_TYPES.map((entry) => entry.value),
);

function trimOrNull(value: FormDataEntryValue | null, maxLength: number): string | null {
  const trimmed = value?.toString().trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

function parseEnum<T extends string>(
  value: FormDataEntryValue | null,
  allowed: Set<string>,
): T | null {
  const raw = value?.toString().trim() ?? "";
  if (!raw) return null;
  if (!allowed.has(raw)) {
    return null;
  }
  return raw as T;
}

function validationError(message: string): { error: string } {
  return { error: message };
}

export function parseAiProfileInput(
  formData: FormData,
): { data: OrganizationAiProfileInput } | { error: string } {
  const writingStyle = parseEnum<WritingStyle>(
    formData.get("writingStyle"),
    WRITING_STYLE_VALUES,
  );
  const defaultCtaStyle = parseEnum<DefaultCtaStyle>(
    formData.get("defaultCtaStyle"),
    CTA_STYLE_VALUES,
  );
  const emojiUsage = parseEnum<EmojiUsage>(
    formData.get("emojiUsage"),
    EMOJI_USAGE_VALUES,
  );
  const newsletterLength = parseEnum<NewsletterLength>(
    formData.get("newsletterLength"),
    NEWSLETTER_LENGTH_VALUES,
  );

  if (formData.get("writingStyle")?.toString().trim() && !writingStyle) {
    return validationError("Select a valid writing style.");
  }
  if (formData.get("defaultCtaStyle")?.toString().trim() && !defaultCtaStyle) {
    return validationError("Select a valid default CTA style.");
  }
  if (formData.get("emojiUsage")?.toString().trim() && !emojiUsage) {
    return validationError("Select a valid emoji usage preference.");
  }
  if (formData.get("newsletterLength")?.toString().trim() && !newsletterLength) {
    return validationError("Select a valid newsletter length.");
  }

  return {
    data: {
      organizationVoice: trimOrNull(formData.get("organizationVoice"), MAX_PROFILE_TEXT_LENGTH),
      writingStyle,
      communicationPreferences: trimOrNull(
        formData.get("communicationPreferences"),
        MAX_PROFILE_TEXT_LENGTH,
      ),
      channelPreferences: trimOrNull(
        formData.get("channelPreferences"),
        MAX_PROFILE_TEXT_LENGTH,
      ),
      defaultCtaStyle,
      emojiUsage,
      newsletterLength,
      facebookTone: trimOrNull(formData.get("facebookTone"), MAX_TONE_LENGTH),
      instagramTone: trimOrNull(formData.get("instagramTone"), MAX_TONE_LENGTH),
      websiteTone: trimOrNull(formData.get("websiteTone"), MAX_TONE_LENGTH),
      principalMessagingStyle: trimOrNull(
        formData.get("principalMessagingStyle"),
        MAX_TONE_LENGTH,
      ),
      audienceDefaults: trimOrNull(formData.get("audienceDefaults"), MAX_PROFILE_TEXT_LENGTH),
    },
  };
}

export function parseTrainingDocumentInput(
  formData: FormData,
): { data: { title: string; documentType: TrainingDocumentType; notes: string | null }; file: File } | { error: string } {
  const title = formData.get("title")?.toString().trim() ?? "";
  const documentType = parseEnum<TrainingDocumentType>(
    formData.get("documentType"),
    DOCUMENT_TYPE_VALUES,
  );
  const notes = trimOrNull(formData.get("notes"), MAX_TRAINING_NOTES_LENGTH);
  const fileField = formData.get("trainingFile");

  if (!title) {
    return validationError("Document title is required.");
  }
  if (title.length > MAX_TRAINING_TITLE_LENGTH) {
    return validationError(
      `Document title must be ${MAX_TRAINING_TITLE_LENGTH} characters or fewer.`,
    );
  }
  if (!documentType) {
    return validationError("Select a valid document type.");
  }
  if (!(fileField instanceof File) || fileField.size === 0) {
    return validationError("Choose a file to register in the Training Library.");
  }
  if (fileField.size > MAX_TRAINING_FILE_BYTES) {
    return validationError("Training files must be 25 MB or smaller.");
  }
  if (fileField.type && !ALLOWED_TRAINING_MIME_TYPES.includes(fileField.type)) {
    return validationError("Unsupported file type for the Training Library.");
  }

  return {
    data: { title, documentType, notes },
    file: fileField,
  };
}

export function parseTrainingDocumentDeleteInput(
  documentId: string,
): { data: { documentId: string } } | { error: string } {
  const trimmed = documentId.trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!trimmed || !uuidPattern.test(trimmed)) {
    return validationError("Invalid training document.");
  }

  return { data: { documentId: trimmed } };
}
