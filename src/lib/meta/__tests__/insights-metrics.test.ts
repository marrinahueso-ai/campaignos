import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FACEBOOK_PAGE_DAILY_METRICS,
  FACEBOOK_POST_METRICS,
  isSkippableInsightsError,
  looksLikeFacebookPhotoId,
} from "../insights-metrics.ts";

test("uses view-based Facebook page metrics instead of deprecated impressions", () => {
  assert.ok(FACEBOOK_PAGE_DAILY_METRICS.includes("page_media_view"));
  assert.ok(FACEBOOK_PAGE_DAILY_METRICS.includes("page_total_media_view_unique"));
  assert.equal(
    FACEBOOK_PAGE_DAILY_METRICS.includes("page_impressions_unique"),
    false,
  );
  assert.equal(FACEBOOK_PAGE_DAILY_METRICS.includes("page_posts_impressions"), false);
});

test("uses view-based Facebook post metrics instead of deprecated impressions", () => {
  assert.ok(FACEBOOK_POST_METRICS.includes("post_media_view"));
  assert.ok(FACEBOOK_POST_METRICS.includes("post_total_media_view_unique"));
  assert.equal(FACEBOOK_POST_METRICS.includes("post_impressions_unique"), false);
  assert.equal(FACEBOOK_POST_METRICS.includes("post_engaged_users"), false);
});

test("detects photo-only Facebook object IDs", () => {
  assert.equal(looksLikeFacebookPhotoId("1234567890"), true);
  assert.equal(looksLikeFacebookPhotoId("987654321_1234567890"), false);
});

test("treats Graph API code 100 as skippable for post insights", () => {
  assert.equal(isSkippableInsightsError(100), true);
  assert.equal(isSkippableInsightsError(190), false);
});
