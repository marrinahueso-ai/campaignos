import { buildDefaultMilestones } from "@/lib/campaign-builder-v2/seed-data";
import {
  defaultEnabledFormats,
  emptyMilestoneArtwork,
} from "@/lib/campaign-builder-v2/platform-utils";
import type {
  CampaignBuilderMilestone,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

function createMilestoneId(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildPreviewForMilestone(
  milestone: CampaignBuilderMilestone,
): MilestonePreviewContent {
  return {
    milestoneId: milestone.id,
    status: "draft",
    artwork: emptyMilestoneArtwork(),
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: milestone.platformFormats,
    deliveryMethod: "auto-publish",
    scheduleDate: milestone.suggestedDate,
    scheduleTime: "09:00",
    emailSendDate: milestone.suggestedDate,
    emailSendTime: "09:00",
    manualEmailTo: "marrina@heyralli.com",
    approvalStatuses: [
      {
        role: "creator",
        label: "Creator",
        status: "not-started",
        timestamp: null,
      },
      {
        role: "committee-chair",
        label: "Committee Chair",
        status: "not-started",
        timestamp: null,
      },
      {
        role: "vp-comms",
        label: "VP Communications",
        status: "not-started",
        timestamp: null,
      },
    ],
  };
}

/**
 * Suggest milestones from campaign date + playbook + global guidance.
 * Uses playbook-aware defaults; AI wiring can replace this later.
 */
export function suggestMilestonesFromContext(input: {
  eventDate: string;
  playbookId: string;
  globalAiGuidance: string;
  brandKitId?: string | null;
  useBrandKit?: boolean;
}): {
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
} {
  // #region agent log
  fetch('http://127.0.0.1:7710/ingest/65b4eb47-1dbb-4922-9af8-eb0ebff6bcb2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'311bfb'},body:JSON.stringify({sessionId:'311bfb',hypothesisId:'H5',location:'suggest-milestones.ts:suggestMilestonesFromContext',message:'called with playbookId',data:{playbookId:input.playbookId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log
  void input.playbookId;
  void input.globalAiGuidance;
  void input.brandKitId;
  void input.useBrandKit;

  const baseMilestones = buildDefaultMilestones(input.eventDate);
  const milestones: CampaignBuilderMilestone[] = baseMilestones.map(
    (milestone, index) => ({
      ...milestone,
      id: createMilestoneId(),
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "",
      captionNotes: "",
      statusTag: index === 0 ? "in-progress" : "not-started",
      sortOrder: index,
    }),
  );

  // #region agent log
  fetch('http://127.0.0.1:7710/ingest/65b4eb47-1dbb-4922-9af8-eb0ebff6bcb2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'311bfb'},body:JSON.stringify({sessionId:'311bfb',hypothesisId:'H5',location:'suggest-milestones.ts:suggestMilestonesFromContext',message:'milestones returned (ignores playbookId)',data:{playbookId:input.playbookId,milestoneNames:milestones.map(m=>m.name)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log

  return {
    milestones,
    previewContents: milestones.map(buildPreviewForMilestone),
  };
}
