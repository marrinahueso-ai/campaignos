/**
 * Flyer library ↔ Approvals hub bridge helpers.
 * Reuses `flyer-composer:` milestone prefix from `@/lib/flyer-composer/approval`.
 */

export {
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
