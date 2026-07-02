export type CampaignProgressArtworkStatus = "complete" | "in_progress" | "needed";

export interface CampaignProgressNextAction {
  title: string;
  estimatedTime: string;
  href: string;
}

export interface CampaignProgressSnapshot {
  completionPercent: number;
  communicationsCompleted: number;
  communicationsTotal: number;
  awaitingApproval: number;
  scheduled: number;
  published: number;
  artworkStatus: CampaignProgressArtworkStatus;
  artworkLabel: string;
  lastUpdatedAt: string | null;
  lastUpdatedLabel: string;
  nextAction: CampaignProgressNextAction | null;
}
