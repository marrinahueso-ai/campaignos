import { planDueDateToScheduledTime } from "@/lib/campaign-plan/plan-milestone-display";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

export function resolveMetaPublishBundleScheduledFor(
  bundle: MetaPublishBundle | undefined,
): string | null {
  if (!bundle) {
    return null;
  }

  if (bundle.scheduledFor) {
    return bundle.scheduledFor;
  }

  return planDueDateToScheduledTime(bundle.dueDate);
}
