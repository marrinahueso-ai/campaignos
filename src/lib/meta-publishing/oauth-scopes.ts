/**
 * OAuth scopes for Meta connect — safe to import from client components.
 *
 * Each scope must be added to the Meta app via a compatible use case and set to
 * "Ready for testing" before OAuth succeeds.
 *
 * Required Meta app use cases:
 * - "Manage everything on your Page" → pages_show_list, pages_read_engagement,
 *   pages_manage_posts, business_management (required when the Page is in Meta Business Suite)
 * - "Manage messaging & content on Instagram" → instagram_basic, instagram_content_publish
 */
export const META_OAUTH_SCOPE_LIST = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
] as const;

/**
 * Additional scopes for Unified Inbox (Phase 2+). Not requested during publish OAuth yet.
 * Each requires Meta App Review before production use.
 *
 * - pages_messaging — read/reply to Facebook Page Messenger conversations
 * - pages_manage_metadata — webhooks and conversation metadata
 * - instagram_manage_messages — read/reply to Instagram DMs
 * - instagram_manage_comments — moderate Instagram comments
 */
export const META_INBOX_OAUTH_SCOPE_LIST = [
  "pages_messaging",
  "pages_manage_metadata",
  "instagram_manage_messages",
  "instagram_manage_comments",
] as const;

export const META_OAUTH_SCOPES = META_OAUTH_SCOPE_LIST.join(",");
export const META_INBOX_OAUTH_SCOPES = META_INBOX_OAUTH_SCOPE_LIST.join(",");

/** Publish + inbox scopes for unified connect / inbox permission reconnect. */
export const META_COMBINED_OAUTH_SCOPE_LIST = [
  ...META_OAUTH_SCOPE_LIST,
  ...META_INBOX_OAUTH_SCOPE_LIST,
] as const;

export const META_COMBINED_OAUTH_SCOPES = META_COMBINED_OAUTH_SCOPE_LIST.join(",");
