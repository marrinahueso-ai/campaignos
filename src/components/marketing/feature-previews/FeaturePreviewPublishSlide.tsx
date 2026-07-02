import { PublishingHub } from "@/components/publishing/PublishingHub";
import {
  PREVIEW_TODAY,
  previewPublishingPublished,
  previewPublishingQueue,
  previewPublishingScheduled,
} from "@/lib/marketing/feature-preview-fixtures";

export function FeaturePreviewPublishSlide() {
  return (
    <div className="pointer-events-none origin-top scale-[0.98]">
      <PublishingHub
        queue={previewPublishingQueue}
        scheduled={previewPublishingScheduled}
        published={previewPublishingPublished}
        today={PREVIEW_TODAY}
      />
    </div>
  );
}
