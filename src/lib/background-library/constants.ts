/** How many individual backgrounds one Generate run creates. */
export const BACKGROUND_LIBRARY_BATCH_SIZE = 10;

export const PLATFORM_BACKGROUNDS_BUCKET = "platform-backgrounds";

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
