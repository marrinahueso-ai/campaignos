import {
  BACKGROUND_LIBRARY_BULK_TOTAL_BYTES,
  BACKGROUND_LIBRARY_BULK_UPLOAD_MAX,
  BACKGROUND_LIBRARY_MAX_BYTES,
} from "./constants.ts";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export function isBackgroundLibraryImageFile(file: File): boolean {
  if (!(file instanceof File) || file.size <= 0) return false;
  if (file.size > BACKGROUND_LIBRARY_MAX_BYTES) return false;
  if (file.type && ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return true;
  }
  // Some browsers omit type for drag-drop; allow common extensions.
  return /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

export function titleFromBackgroundFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base || "Library background";
}

export function collectBackgroundBulkUploadFiles(formData: FormData): {
  files: File[];
  error: string | null;
} {
  const raw = formData.getAll("files").filter((entry): entry is File => {
    return entry instanceof File && entry.size > 0;
  });

  if (raw.length === 0) {
    return {
      files: [],
      error: "Choose one or more images to upload into the library.",
    };
  }

  if (raw.length > BACKGROUND_LIBRARY_BULK_UPLOAD_MAX) {
    return {
      files: [],
      error: `Upload at most ${BACKGROUND_LIBRARY_BULK_UPLOAD_MAX} images at a time.`,
    };
  }

  const invalid = raw.find((file) => !isBackgroundLibraryImageFile(file));
  if (invalid) {
    if (invalid.size > BACKGROUND_LIBRARY_MAX_BYTES) {
      return {
        files: [],
        error: `"${invalid.name}" is larger than 12MB.`,
      };
    }
    return {
      files: [],
      error: `"${invalid.name}" is not a supported image (PNG, JPEG, WebP, or GIF).`,
    };
  }

  const totalBytes = raw.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > BACKGROUND_LIBRARY_BULK_TOTAL_BYTES) {
    const limitMb = Math.round(BACKGROUND_LIBRARY_BULK_TOTAL_BYTES / (1024 * 1024));
    return {
      files: [],
      error: `Those images total more than ${limitMb}MB. Upload fewer files or smaller images.`,
    };
  }

  return { files: raw, error: null };
}
