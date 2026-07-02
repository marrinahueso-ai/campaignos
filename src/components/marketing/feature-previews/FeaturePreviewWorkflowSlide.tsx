import { CampaignScheduleStep } from "@/components/event-workspace/CampaignScheduleStep";
import { previewMetaPublishBundles } from "@/lib/marketing/feature-preview-fixtures";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  "Communication Plan",
  "Artwork",
  "Posts & Schedule",
  "Review & Publish",
  "Published",
] as const;

export function FeaturePreviewWorkflowSlide() {
  return (
    <div className="space-y-4">
      <div>
        <p className="studio-eyebrow">Campaign workflow</p>
        <p className="font-display text-2xl text-cos-text">Fall Festival</p>
      </div>

      <div className="overflow-x-auto border-b border-cos-border">
        <div className="flex min-w-max gap-0">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={cn(
                "px-3 py-2.5 text-xs font-medium tracking-wide uppercase sm:px-4",
                index === 2
                  ? "border-b-2 border-cos-text bg-cos-bg/60 text-cos-text"
                  : "text-cos-muted",
              )}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none origin-top scale-[0.98]">
        <CampaignScheduleStep
          eventId="preview"
          metaPublishBundles={previewMetaPublishBundles}
          metaSocialCaptionMilestones={[]}
          aiStatus={{ available: true, reason: null }}
          userRole="vp_communications"
        />
      </div>
    </div>
  );
}
