import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildContentBreakdownFromPosts,
  buildInsightsRecommendation,
} from "../recommendations.ts";

test("buildContentBreakdownFromPosts groups synced posts by platform and placement", () => {
  const breakdown = buildContentBreakdownFromPosts([
    { platform: "facebook", placement: "feed", engagement: 120 },
    { platform: "facebook", placement: "feed", engagement: 80 },
    { platform: "instagram", placement: "story", engagement: 50 },
  ]);

  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].label, "Facebook feed");
  assert.equal(breakdown[0].count, 2);
  assert.equal(breakdown[0].engagement, 200);
  assert.equal(breakdown[0].percent, 80);
  assert.equal(breakdown[1].label, "Instagram stories");
  assert.equal(breakdown[1].percent, 20);
});

test("buildContentBreakdownFromPosts falls back to post counts when engagement is zero", () => {
  const breakdown = buildContentBreakdownFromPosts([
    { platform: "facebook", placement: "feed", engagement: 0 },
    { platform: "instagram", placement: "feed", engagement: 0 },
    { platform: "instagram", placement: "feed", engagement: 0 },
  ]);

  assert.equal(breakdown[0].label, "Instagram feed");
  assert.equal(breakdown[0].percent, 67);
  assert.equal(breakdown[1].label, "Facebook feed");
  assert.equal(breakdown[1].percent, 33);
});

test("buildInsightsRecommendation returns null without metrics", () => {
  const recommendation = buildInsightsRecommendation({
    kpis: [],
    contentBreakdown: [],
    platformComparison: [],
    topPosts: [],
    hasAnyMetrics: false,
  });

  assert.equal(recommendation, null);
});

test("buildInsightsRecommendation uses real aggregates only", () => {
  const recommendation = buildInsightsRecommendation({
    kpis: [
      {
        key: "engagement",
        label: "Engagement",
        value: 420,
        previousValue: 300,
        changePercent: 40,
        unavailableReason: null,
      },
      {
        key: "reach",
        label: "Reach",
        value: 5000,
        previousValue: 4000,
        changePercent: 25,
        unavailableReason: null,
      },
      {
        key: "likes",
        label: "Likes",
        value: 180,
        previousValue: 120,
        changePercent: 50,
        unavailableReason: null,
      },
      {
        key: "comments",
        label: "Comments",
        value: 20,
        previousValue: 10,
        changePercent: 100,
        unavailableReason: null,
      },
      {
        key: "shares",
        label: "Shares",
        value: 8,
        previousValue: 4,
        changePercent: 100,
        unavailableReason: null,
      },
    ],
    contentBreakdown: [
      {
        label: "Instagram feed",
        count: 3,
        engagement: 250,
        percent: 60,
      },
      {
        label: "Facebook feed",
        count: 2,
        engagement: 170,
        percent: 40,
      },
    ],
    platformComparison: [
      {
        platform: "facebook",
        reach: 2000,
        engagement: 170,
        previousReach: 1800,
        previousEngagement: 140,
        reachChangePercent: 11.1,
        unavailableReason: null,
      },
      {
        platform: "instagram",
        reach: 3000,
        engagement: 250,
        previousReach: 2200,
        previousEngagement: 160,
        reachChangePercent: 36.4,
        unavailableReason: null,
      },
    ],
    topPosts: [
      {
        id: "post-1",
        title: "Book Fair Reminder",
        platform: "instagram",
        placement: "feed",
        publishedAt: "2026-07-01T12:00:00.000Z",
        reach: 1200,
        engagement: 180,
        externalPostId: "ig-1",
      },
    ],
    hasAnyMetrics: true,
  });

  assert.ok(recommendation);
  assert.match(recommendation.summary, /parent engagement is up 40%/i);
  assert.ok(recommendation.items.some((item) => item.title === "What worked best"));
  assert.ok(recommendation.items.some((item) => item.title === "Standout post"));
  assert.ok(
    recommendation.items.some((item) =>
      item.body.includes("Book Fair Reminder"),
    ),
  );
});
