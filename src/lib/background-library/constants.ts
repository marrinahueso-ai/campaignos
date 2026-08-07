/** How many individual backgrounds one Generate run creates. */
export const BACKGROUND_LIBRARY_BATCH_SIZE = 10;

export const PLATFORM_BACKGROUNDS_BUCKET = "platform-backgrounds";

/** Max bytes per Background Library image (sources + finished assets). */
export const BACKGROUND_LIBRARY_MAX_BYTES = 12 * 1024 * 1024;

/** Cap how many finished assets one bulk upload may create. */
export const BACKGROUND_LIBRARY_BULK_UPLOAD_MAX = 40;

/**
 * Display-only Supabase Image Transformation widths.
 * Originals stay at `storage_path` / `public_url`; never persist these URLs.
 */
export const BACKGROUND_LIBRARY_GRID_THUMB_WIDTH = 360;
export const BACKGROUND_LIBRARY_DETAIL_THUMB_WIDTH = 800;

export const BACKGROUND_ASSET_STATUSES = [
  "pending_review",
  "published",
  "archived",
] as const;

export const BACKGROUND_SEASONS = [
  "anytime",
  "fall",
  "winter",
  "spring",
  "summer",
] as const;

export const BACKGROUND_SCHOOL_LEVELS = [
  "any",
  "elementary",
  "middle",
  "high",
] as const;
