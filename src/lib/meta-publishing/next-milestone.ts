import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { MetaPublishBundle, MetaPublishBundleStatus } from "@/lib/meta-publishing/types";

const INCOMPLETE_STATUSES: MetaPublishBundleStatus[] = [
  "needs_artwork",
  "needs_caption",
  "ready",
  "approved",
  "failed",
];

export type NextMilestoneTarget = {
  relativeDay: number;
  title: string;
  step: CampaignWorkflowStep;
};

function activeMetaBundles(bundles: MetaPublishBundle[]): MetaPublishBundle[] {
  return bundles
    .filter((bundle) => bundle.isMetaPost && bundle.status !== "skipped")
    .sort((left, right) => left.relativeDay - right.relativeDay);
}

function workflowStepForBundle(bundle: MetaPublishBundle): CampaignWorkflowStep {
  if (bundle.status === "needs_artwork") {
    return "artwork";
  }
  if (bundle.status === "needs_caption") {
    return "schedule";
  }
  return "publish";
}

export function findNextIncompleteMilestone(
  bundles: MetaPublishBundle[],
  afterRelativeDay: number,
): NextMilestoneTarget | null {
  const next = activeMetaBundles(bundles).find(
    (bundle) =>
      bundle.relativeDay > afterRelativeDay &&
      INCOMPLETE_STATUSES.includes(bundle.status),
  );

  if (!next) {
    return null;
  }

  return {
    relativeDay: next.relativeDay,
    title: next.title,
    step: workflowStepForBundle(next),
  };
}

export function allMetaMilestonesComplete(bundles: MetaPublishBundle[]): boolean {
  const active = activeMetaBundles(bundles);
  if (active.length === 0) {
    return false;
  }

  return active.every(
    (bundle) =>
      bundle.status === "published" ||
      bundle.status === "posting" ||
      bundle.status === "scheduled",
  );
}
