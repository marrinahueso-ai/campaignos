/**
 * Meta Graph API insight metric names (v21+).
 * Deprecated impression metrics were replaced with view-based metrics in 2025.
 * @see https://developers.facebook.com/docs/platforminsights/page/deprecated-metrics/
 */

/** Daily Facebook Page metrics — reach/views, engagement, reactions. */
export const FACEBOOK_PAGE_DAILY_METRICS = [
  "page_total_media_view_unique",
  "page_media_view",
  "page_post_engagements",
  "page_actions_post_reactions_like_total",
] as const;

/** Lifetime Facebook post metrics — reach/views, reactions, comments, shares, clicks. */
export const FACEBOOK_POST_METRICS = [
  "post_total_media_view_unique",
  "post_media_view",
  "post_reactions_like_total",
  "post_comments",
  "post_shares",
  "post_clicks",
] as const;

/** Instagram account metrics that require metric_type=total_value with period=day. */
export const INSTAGRAM_ACCOUNT_TOTAL_VALUE_METRICS = ["accounts_engaged"] as const;

/** Instagram account metrics that return daily time series without metric_type. */
export const INSTAGRAM_ACCOUNT_TIME_SERIES_METRICS = ["reach"] as const;

export const INSTAGRAM_FEED_MEDIA_METRICS = [
  "reach",
  "likes",
  "comments",
  "shares",
  "saved",
  "total_interactions",
] as const;

export const INSTAGRAM_STORY_MEDIA_METRICS = ["reach", "replies", "shares"] as const;

/** Graph API error codes that indicate a post/media is gone or inaccessible — safe to skip. */
export const SKIPPABLE_INSIGHTS_ERROR_CODES = new Set([100, 803]);

export function isSkippableInsightsError(errorCode: number | undefined): boolean {
  return errorCode != null && SKIPPABLE_INSIGHTS_ERROR_CODES.has(errorCode);
}

export function looksLikeFacebookPhotoId(id: string): boolean {
  return /^\d+$/.test(id.trim());
}
