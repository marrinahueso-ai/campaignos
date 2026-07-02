import { calculateCampaignIntelligence } from "@/lib/campaign-intelligence";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import { getTodayDateString } from "@/lib/utils/dates";
import type { Event } from "@/types";
import type { EventWorkspaceData } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

export function getCampaignIntelligenceFromWorkspace(
  event: Event,
  workspace: EventWorkspaceData,
  steps: EventCommunicationStep[] = [],
): CampaignIntelligence {
  return calculateCampaignIntelligence({
    event,
    steps,
    assets: workspace.assets,
    communications: workspace.communications,
    approvalRequests: workspace.approvalRequests,
    publicationSchedule: workspace.publicationSchedule,
    today: getTodayDateString(),
  });
}
