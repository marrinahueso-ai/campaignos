export const META_OAUTH_AUTHORIZE_URL = "https://www.facebook.com/dialog/oauth";

/**
 * Permissions requested during Facebook OAuth. Names match Meta's current Graph API
 * permission strings (2024–2026 use-case model). Each scope must be added to the Meta
 * app via a compatible use case and set to "Ready for testing" before OAuth succeeds.
 *
 * Required Meta app use cases (Facebook Login alone is incompatible — create a new app
 * with these instead, or add them if your dashboard allows):
 * - "Manage everything on your Page" → pages_show_list, pages_read_engagement, pages_manage_posts,
 *   business_management (required when the Page is in Meta Business Suite)
 * - "Manage messaging & content on Instagram" → instagram_basic, instagram_content_publish
 *
 * @see https://developers.facebook.com/docs/development/create-an-app
 * @see https://developers.facebook.com/docs/permissions/
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

export const META_OAUTH_STATE_COOKIE = "meta_oauth_state";
export const META_OAUTH_RETURN_COOKIE = "meta_oauth_return_to";
export const META_OAUTH_PAGE_ID_COOKIE = "meta_oauth_page_id";
