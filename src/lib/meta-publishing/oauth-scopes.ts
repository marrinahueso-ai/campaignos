/**
 * OAuth scopes for Meta connect — safe to import from client components.
 *
 * Each scope must be added to the Meta app via a compatible use case and set to
 * "Ready for testing" before OAuth succeeds.
 *
 * Required Meta app use cases:
 * - "Manage everything on your Page" → pages_show_list, pages_read_engagement, pages_manage_posts,
 *   business_management (required when the Page is in Meta Business Suite)
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

export const META_OAUTH_SCOPES = META_OAUTH_SCOPE_LIST.join(",");
