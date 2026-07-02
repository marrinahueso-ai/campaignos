import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { EVENT_ASSET_TYPES } from "@/lib/event-workspace/constants";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type { CampaignIntelligenceInput, CampaignReadinessLabel } from "@/lib/campaign-intelligence/types";
import type { CommunicationChannel } from "@/types/event-workspace";

const VISUAL_ASSET_TYPES = new Set(["hero_image", "flyer", "square_graphic", "instagram_story"]);

const KEY_CHANNELS_FULL: CommunicationChannel[] = [
  "website_announcement",
  "newsletter",
  "facebook",
  "instagram",
  "flyer",
];

const KEY_CHANNELS_REMINDER: CommunicationChannel[] = [
  "newsletter",
  "facebook",
  "instagram",
];

export interface CampaignScoreBreakdown {
  completionPercent: number;
  readinessLabel: CampaignReadinessLabel;
  missingPieces: string[];
  overdueItems: string[];
  waitingItems: string[];
  blockedItems: string[];
  doneItems: string[];
  needsAttention: string[];
  hasArtwork: boolean;
  hasPendingApprovals: boolean;
  hasReadyToPublish: boolean;
}

function channelLabel(channel: CommunicationChannel): string {
  return CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");
}

function getKeyChannels(strategy: CampaignIntelligenceInput["event"]["communicationStrategy"]): CommunicationChannel[] {
  if (strategy === "reminder_only") {
    return KEY_CHANNELS_REMINDER;
  }
  return KEY_CHANNELS_FULL;
}

function isCommReady(status: string): boolean {
  return status === "approved" || status === "published";
}

function scoreSteps(input: CampaignIntelligenceInput): {
  score: number;
  doneItems: string[];
  overdueItems: string[];
  needsAttention: string[];
} {
  const required = input.steps.filter((step) => step.isRequired);
  if (required.length === 0) {
    return { score: 1, doneItems: [], overdueItems: [], needsAttention: [] };
  }

  const doneItems: string[] = [];
  const overdueItems: string[] = [];
  const needsAttention: string[] = [];

  for (const step of required) {
    if (step.status === "completed") {
      doneItems.push(step.title);
      continue;
    }
    if (step.status === "upcoming" && step.dueDate < input.today) {
      overdueItems.push(step.title);
      needsAttention.push(step.title);
      continue;
    }
    if (step.status === "upcoming" && step.dueDate === input.today) {
      needsAttention.push(`${step.title} — due today`);
    }
  }

  const completed = required.filter((step) => step.status === "completed").length;
  return {
    score: completed / required.length,
    doneItems,
    overdueItems,
    needsAttention,
  };
}

function scoreCommunications(input: CampaignIntelligenceInput): {
  score: number;
  missingPieces: string[];
  doneItems: string[];
} {
  const channels = getKeyChannels(input.event.communicationStrategy);
  const commsByChannel = new Map(
    input.communications.map((item) => [item.channel, item]),
  );

  const missingPieces: string[] = [];
  const doneItems: string[] = [];
  let ready = 0;

  for (const channel of channels) {
    const item = commsByChannel.get(channel);
    if (!item || !isCommReady(item.status)) {
      missingPieces.push(channelLabel(channel));
      continue;
    }
    ready += 1;
    if (item.status === "published") {
      doneItems.push(`${channelLabel(channel)} published`);
    } else if (item.status === "approved") {
      doneItems.push(`${channelLabel(channel)} approved`);
    } else {
      doneItems.push(`${channelLabel(channel)} draft ready`);
    }
  }

  return {
    score: channels.length === 0 ? 1 : ready / channels.length,
    missingPieces,
    doneItems,
  };
}

function scoreArtwork(input: CampaignIntelligenceInput): {
  score: number;
  hasArtwork: boolean;
  missingPieces: string[];
  doneItems: string[];
} {
  const uploadedVisual = input.assets.filter(
    (asset) =>
      asset.status === "uploaded" &&
      VISUAL_ASSET_TYPES.has(asset.assetType) &&
      !!(asset.filename || asset.storagePath),
  );

  const hasArtwork = uploadedVisual.length > 0;
  const doneItems = uploadedVisual.map((asset) => {
    const label =
      EVENT_ASSET_TYPES.find((entry) => entry.assetType === asset.assetType)?.label ??
      asset.assetType;
    return `${label} uploaded`;
  });

  if (input.event.communicationStrategy === "reminder_only") {
    return {
      score: hasArtwork ? 1 : 0.5,
      hasArtwork,
      missingPieces: hasArtwork ? [] : ["Event artwork"],
      doneItems,
    };
  }

  return {
    score: hasArtwork ? 1 : 0,
    hasArtwork,
    missingPieces: hasArtwork ? [] : ["Event artwork"],
    doneItems,
  };
}

function scoreApprovals(input: CampaignIntelligenceInput): {
  score: number;
  waitingItems: string[];
  blockedItems: string[];
  hasPendingApprovals: boolean;
  doneItems: string[];
} {
  const pendingRequests = input.approvalRequests.filter(
    (request) => request.status === "pending",
  );
  const approvedRequests = input.approvalRequests.filter(
    (request) => request.status === "approved",
  );
  const pendingComms = input.communications.filter(
    (item) => item.status === "pending_approval",
  );

  const waitingItems = [
    ...pendingRequests.map((request) => {
      const item = input.communications.find(
        (entry) => entry.id === request.communicationItemId,
      );
      return item
        ? `${channelLabel(item.channel)} waiting on approval`
        : "Draft waiting on approval";
    }),
    ...pendingComms
      .filter(
        (item) =>
          !pendingRequests.some(
            (request) => request.communicationItemId === item.id,
          ),
      )
      .map((item) => `${channelLabel(item.channel)} waiting on approval`),
  ];

  const blockedItems = waitingItems.map(
    () => "Waiting on approval before scheduling",
  );

  const approvedComms = input.communications.filter(
    (item) => item.status === "approved" || item.status === "published",
  );

  const doneCount = Math.max(approvedRequests.length, approvedComms.length);

  return {
    score: waitingItems.length === 0 ? 1 : Math.max(0, 1 - waitingItems.length * 0.35),
    waitingItems,
    blockedItems,
    hasPendingApprovals: waitingItems.length > 0,
    doneItems:
      doneCount > 0
        ? [`${doneCount} approval${doneCount === 1 ? "" : "s"} complete`]
        : [],
  };
}

function scorePublication(input: CampaignIntelligenceInput): {
  score: number;
  hasReadyToPublish: boolean;
  doneItems: string[];
  needsAttention: string[];
} {
  const scheduled = input.publicationSchedule.filter(
    (item) => item.status === "scheduled",
  );
  const published = input.publicationSchedule.filter(
    (item) => item.status === "published",
  );

  const approvedUnpublished = input.communications.filter(
    (item) => item.status === "approved" && !item.isPublished,
  );

  const hasReadyToPublish =
    scheduled.length > 0 || approvedUnpublished.length > 0;

  const needsAttention =
    approvedUnpublished.length > 0
      ? approvedUnpublished.map(
          (item) => `${channelLabel(item.channel)} ready to publish`,
        )
      : [];

  const doneItems = [
    ...published.map(() => "Publication complete"),
    ...scheduled.map(() => "Publication scheduled"),
  ];

  const score =
    published.length > 0
      ? 1
      : scheduled.length > 0
        ? 0.85
        : approvedUnpublished.length > 0
          ? 0.75
          : 0.5;

  return {
    score,
    hasReadyToPublish,
    doneItems,
    needsAttention,
  };
}

export function scoreCampaign(input: CampaignIntelligenceInput): CampaignScoreBreakdown {
  const strategy = input.event.communicationStrategy;

  if (strategy === "calendar_only" || !shouldAssignPlaybook(strategy)) {
    return {
      completionPercent: 100,
      readinessLabel: "calendar_only",
      missingPieces: [],
      overdueItems: [],
      waitingItems: [],
      blockedItems: [],
      doneItems: ["On the calendar"],
      needsAttention: [],
      hasArtwork: input.assets.some((asset) => asset.status === "uploaded"),
      hasPendingApprovals: false,
      hasReadyToPublish: false,
    };
  }

  const steps = scoreSteps(input);
  const comms = scoreCommunications(input);
  const artwork = scoreArtwork(input);
  const approvals = scoreApprovals(input);
  const publication = scorePublication(input);

  const weights =
    strategy === "reminder_only"
      ? { steps: 0.5, comms: 0.25, artwork: 0.1, approvals: 0.05, publication: 0.1 }
      : { steps: 0.35, comms: 0.3, artwork: 0.15, approvals: 0.1, publication: 0.1 };

  const raw =
    steps.score * weights.steps +
    comms.score * weights.comms +
    artwork.score * weights.artwork +
    approvals.score * weights.approvals +
    publication.score * weights.publication;

  const completionPercent = Math.min(100, Math.round(raw * 100));

  const missingPieces = [...comms.missingPieces, ...artwork.missingPieces];
  const overdueItems = steps.overdueItems;
  const waitingItems = approvals.waitingItems;
  const blockedItems = approvals.blockedItems;
  const doneItems = [
    ...steps.doneItems.slice(0, 3),
    ...comms.doneItems.slice(0, 3),
    ...artwork.doneItems.slice(0, 2),
    ...approvals.doneItems,
    ...publication.doneItems.slice(0, 2),
  ].slice(0, 6);

  const needsAttention = [
    ...steps.needsAttention,
    ...publication.needsAttention,
    ...missingPieces.map((piece) => `${piece} still needed`),
  ].slice(0, 5);

  let readinessLabel: CampaignReadinessLabel = "on_track";

  if (approvals.hasPendingApprovals) {
    readinessLabel = "waiting_on_approval";
  } else if (overdueItems.length > 0) {
    readinessLabel = "needs_attention";
  } else if (publication.hasReadyToPublish && completionPercent >= 60) {
    readinessLabel = "ready_to_publish";
  } else if (needsAttention.length > 0 && completionPercent < 70) {
    readinessLabel = "needs_attention";
  } else if (completionPercent >= 65 && overdueItems.length === 0) {
    readinessLabel = "on_track";
  } else if (needsAttention.length > 0) {
    readinessLabel = "needs_attention";
  }

  return {
    completionPercent,
    readinessLabel,
    missingPieces,
    overdueItems,
    waitingItems,
    blockedItems,
    doneItems,
    needsAttention,
    hasArtwork: artwork.hasArtwork,
    hasPendingApprovals: approvals.hasPendingApprovals,
    hasReadyToPublish: publication.hasReadyToPublish,
  };
}

export function getReadinessDisplay(label: CampaignReadinessLabel): string {
  switch (label) {
    case "calendar_only":
      return "Calendar only";
    case "on_track":
      return "On track";
    case "needs_attention":
      return "Needs attention";
    case "waiting_on_approval":
      return "Waiting on approval";
    case "ready_to_publish":
      return "Ready to publish";
    default:
      return "On track";
  }
}
