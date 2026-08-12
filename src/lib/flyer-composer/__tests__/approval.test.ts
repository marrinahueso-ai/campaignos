import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FLYER_COMPOSER_CAMPAIGN_NAME,
  FLYER_COMPOSER_MILESTONE_PREFIX,
  buildFlyerComposerMilestoneId,
  flyerChangesHref,
  flyerComposerApprovalTitle,
  flyerComposerEditHref,
  flyerReviewHref,
  isFlyerComposerMilestoneId,
  isPersistableFlyerApprovalImageUrl,
  parseFlyerIdFromMilestoneId,
} from "@/lib/flyer-composer/approval";

describe("flyer composer approval helpers", () => {
  it("builds and detects flyer-composer milestone ids", () => {
    const id = buildFlyerComposerMilestoneId("abc-123");
    assert.equal(id, `${FLYER_COMPOSER_MILESTONE_PREFIX}abc-123`);
    assert.equal(isFlyerComposerMilestoneId(id), true);
    assert.equal(isFlyerComposerMilestoneId("milestone-1"), false);
    assert.equal(
      buildFlyerComposerMilestoneId(`${FLYER_COMPOSER_MILESTONE_PREFIX}abc-123`),
      `${FLYER_COMPOSER_MILESTONE_PREFIX}abc-123`,
    );
  });

  it("parses flyer id from milestone id", () => {
    assert.equal(
      parseFlyerIdFromMilestoneId("flyer-composer:uuid-1"),
      "uuid-1",
    );
    assert.equal(parseFlyerIdFromMilestoneId("newsletter:x"), null);
  });

  it("rejects empty submission keys", () => {
    assert.throws(() => buildFlyerComposerMilestoneId("  "));
  });

  it("titles flyers from headline, org, or template", () => {
    assert.equal(
      flyerComposerApprovalTitle({ headline: "Spring Fair" }),
      "Spring Fair",
    );
    assert.equal(
      flyerComposerApprovalTitle({ orgName: "Riverside PTA" }),
      "Riverside PTA flyer",
    );
    assert.equal(
      flyerComposerApprovalTitle({ templateName: "Semester at a Glance" }),
      "Semester at a Glance",
    );
    assert.equal(flyerComposerApprovalTitle({}), "Flyer");
    assert.equal(FLYER_COMPOSER_CAMPAIGN_NAME, "Flyer");
  });

  it("deep-links to flyer builder, changes, and review", () => {
    assert.equal(
      flyerComposerEditHref(),
      "/create-with-ai/flyer?view=result",
    );
    assert.equal(
      flyerComposerEditHref({ flyerId: "f1" }),
      "/create-with-ai/flyer?flyerId=f1",
    );
    assert.match(
      flyerComposerEditHref({ absolute: true }),
      /\/create-with-ai\/flyer\?view=result$/,
    );
    assert.equal(flyerChangesHref("f1"), "/flyers/f1/changes");
    assert.equal(flyerReviewHref("f1"), "/flyers/f1/review");
  });

  it("accepts hosted and data image urls only", () => {
    assert.equal(
      isPersistableFlyerApprovalImageUrl("https://cdn.example/a.png"),
      true,
    );
    assert.equal(
      isPersistableFlyerApprovalImageUrl("data:image/png;base64,abc"),
      true,
    );
    assert.equal(isPersistableFlyerApprovalImageUrl("blob:http://x"), false);
    assert.equal(isPersistableFlyerApprovalImageUrl(""), false);
  });
});
