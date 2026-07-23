import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractViewsFromRawMetrics,
  isReachMetric,
  isTotalMediaViewMetric,
  parseDailyInsights,
  parsePostInsights,
} from "../insights-normalize.ts";

test("classifies Meta media view metrics correctly", () => {
  assert.equal(isTotalMediaViewMetric("page_media_view"), true);
  assert.equal(isTotalMediaViewMetric("post_media_view"), true);
  assert.equal(isTotalMediaViewMetric("page_total_media_view_unique"), false);
  assert.equal(isReachMetric("page_total_media_view_unique"), true);
  assert.equal(isReachMetric("reach"), true);
  assert.equal(isReachMetric("page_media_view"), false);
});

test("parseDailyInsights maps Views and Reach without double-counting", () => {
  const rows = parseDailyInsights([
    {
      name: "page_media_view",
      values: [{ value: 241, end_time: "2026-07-02T07:00:00+0000" }],
    },
    {
      name: "page_total_media_view_unique",
      values: [{ value: 90, end_time: "2026-07-02T07:00:00+0000" }],
    },
    {
      name: "page_post_engagements",
      values: [{ value: 8, end_time: "2026-07-02T07:00:00+0000" }],
    },
    {
      name: "page_actions_post_reactions_like_total",
      values: [{ value: 4, end_time: "2026-07-02T07:00:00+0000" }],
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].views, 241);
  assert.equal(rows[0].reach, 90);
  assert.equal(rows[0].engagement, 8);
  assert.equal(rows[0].likes, 4);
});

test("parsePostInsights derives Facebook engagement and views", () => {
  const insight = parsePostInsights([
    { name: "post_media_view", values: [{ value: 45 }] },
    { name: "post_total_media_view_unique", values: [{ value: 30 }] },
    { name: "post_reactions_like_total", values: [{ value: 4 }] },
    { name: "post_comments", values: [{ value: 1 }] },
    { name: "post_shares", values: [{ value: 2 }] },
  ]);

  assert.equal(insight.views, 45);
  assert.equal(insight.reach, 30);
  assert.equal(insight.likes, 4);
  assert.equal(insight.comments, 1);
  assert.equal(insight.shares, 2);
  assert.equal(insight.engagement, 7);
});

test("extractViewsFromRawMetrics prefers total media views", () => {
  assert.equal(
    extractViewsFromRawMetrics(
      { page_media_view: 241, page_total_media_view_unique: 90 },
      90,
    ),
    241,
  );
  assert.equal(extractViewsFromRawMetrics({ views: 12 }, 5), 12);
  assert.equal(extractViewsFromRawMetrics({}, 5), 5);
});
