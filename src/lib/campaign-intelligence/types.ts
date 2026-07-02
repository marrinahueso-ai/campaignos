import type { CommunicationStrategy } from "@/types/communication-strategy";
import type {
  ApprovalRequest,
  CommunicationItem,
  EventAsset,
  PublicationScheduleItem,
} from "@/types/event-workspace";
import type { Event } from "@/types";
import type { EventCommunicationStep } from "@/types/playbooks";

export type CampaignReadinessLabel =
  | "on_track"
  | "needs_attention"
  | "waiting_on_approval"
  | "ready_to_publish"
  | "calendar_only";

export type CampaignActionVerb =
  | "Review"
  | "Draft"
  | "Schedule"
  | "Continue"
  | "Open"
  | "Upload";

export interface CampaignNextAction {
  verb: CampaignActionVerb;
  description: string;
  href: string;
}

export interface CampaignIntelligence {
  eventId: string;
  communicationStrategy: CommunicationStrategy;
  completionPercent: number;
  readinessLabel: CampaignReadinessLabel;
  readinessDisplay: string;
  summary: string;
  nextAction: CampaignNextAction | null;
  doneItems: string[];
  needsAttention: string[];
  missingPieces: string[];
  overdueItems: string[];
  waitingItems: string[];
  blockedItems: string[];
}

export interface CampaignIntelligenceInput {
  event: Event;
  steps: EventCommunicationStep[];
  assets: EventAsset[];
  communications: CommunicationItem[];
  approvalRequests: ApprovalRequest[];
  publicationSchedule: PublicationScheduleItem[];
  today: string;
}
