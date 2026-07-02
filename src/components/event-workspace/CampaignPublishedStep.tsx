import { CheckCircle2 } from "lucide-react";
import { MetaPublishBundleCard } from "@/components/meta-publishing/MetaPublishBundlesPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimelineSection } from "@/components/event-workspace/TimelineSection";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { ActivityLogEntry } from "@/types/event-workspace";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignPublishedStepProps {
  metaPublishBundles: MetaPublishBundle[];
  timeline: ActivityLogEntry[];
}

export function CampaignPublishedStep({
  metaPublishBundles,
  timeline,
}: CampaignPublishedStepProps) {
  const publishedBundles = metaPublishBundles.filter(
    (bundle) => bundle.status === "published",
  );

  const publishActivity = timeline.filter(
    (entry) => entry.activityType === "published",
  );

  const hasPublished = publishedBundles.length > 0 || publishActivity.length > 0;

  return (
    <div className="space-y-6">
      {!hasPublished ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing published yet"
          description="When communications are marked published, they will appear here as event history."
        />
      ) : (
        <div className="space-y-4">
          <Card padding="none" className="overflow-hidden">
            <CardHeader className="border-b border-cos-border px-6 py-5">
              <CardTitle>Published milestones</CardTitle>
              <CardDescription>
                Meta feed and story posts marked published for this event.
              </CardDescription>
            </CardHeader>
            <div className="space-y-4 p-5">
              {publishedBundles.map((bundle) => (
                <MetaPublishBundleCard key={bundle.relativeDay} bundle={bundle} showCaptionPreview={false} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {publishActivity.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-cos-text">Activity history</h3>
          <TimelineSection timeline={publishActivity} />
        </section>
      )}
    </div>
  );
}
