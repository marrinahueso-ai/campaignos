/** Quality model for milestone social captions (not gpt-4o-mini). */
export const DEFAULT_META_CAPTION_MODEL = "gpt-5-mini";

export function resolveMetaCaptionModel(): string {
  return process.env.OPENAI_META_CAPTION_MODEL?.trim() || DEFAULT_META_CAPTION_MODEL;
}

export const META_CAPTION_FEED_MAX_TOKENS = 500;
export const META_CAPTION_STORY_MAX_TOKENS = 200;
