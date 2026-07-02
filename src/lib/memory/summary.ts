import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type { CampaignMemorySummary } from "@/lib/memory/types";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import type { Event } from "@/types";
import type {
  CommunicationItem,
  EventAsset,
  PublicationScheduleItem,
} from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

const VISUAL_ASSET_TYPES = new Set([
  "hero_image",
  "square_graphic",
  "instagram_story",
  "flyer",
]);

function channelLabel(channel: CommunicationItem["channel"]): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    CHANNEL_LABELS[channel] ??
    channel.replaceAll("_", " ")
  );
}

function isCommReady(status: CommunicationItem["status"]): boolean {
  return status === "generated" || status === "approved" || status === "published";
}

function hasUploadedArtwork(assets: EventAsset[]): boolean {
  return assets.some(
    (asset) =>
      asset.status === "uploaded" &&
      VISUAL_ASSET_TYPES.has(asset.assetType) &&
      !!(asset.filename || asset.storagePath),
  );
}

function buildClosingLine(
  intelligence: CampaignIntelligence | null | undefined,
  steps: EventCommunicationStep[],
  publicationSchedule: PublicationScheduleItem[],
): string | null {
  if (intelligence?.readinessLabel === "ready_to_publish") {
    return "Some messages are ready when you are.";
  }

  if (intelligence && intelligence.completionPercent >= 85) {
    return "The campaign finished on schedule.";
  }

  const published = publicationSchedule.filter((item) => item.status === "published");
  if (published.length > 0) {
    return "Publishing is underway.";
  }

  const required = steps.filter((step) => step.isRequired);
  const completed = required.filter((step) => step.status === "completed").length;
  if (required.length > 0 && completed === required.length) {
    return "The campaign finished on schedule.";
  }

  if (intelligence && intelligence.completionPercent >= 50) {
    return "You're making good progress.";
  }

  return null;
}

export function buildCampaignMemorySummary(input: {
  event: Event;
  communications: CommunicationItem[];
  assets: EventAsset[];
  intelligence?: CampaignIntelligence | null;
  steps?: EventCommunicationStep[];
  publicationSchedule?: PublicationScheduleItem[];
}): CampaignMemorySummary {
  const { event, communications, assets } = input;
  const steps = input.steps ?? [];
  const publicationSchedule = input.publicationSchedule ?? [];

  const channelHighlights = communications
    .filter((item) => isCommReady(item.status))
    .map((item) => channelLabel(item.channel));

  const uniqueChannels = [...new Set(channelHighlights)];
  const artworkUploaded = hasUploadedArtwork(assets);
  const closingLine = buildClosingLine(
    input.intelligence,
    steps,
    publicationSchedule,
  );

  const introLine =
    uniqueChannels.length > 0
      ? "This campaign included:"
      : "This event is on the calendar.";

  const artworkLine = artworkUploaded ? "Artwork was uploaded." : null;

  const narrativeParts = [
    `${event.title}.`,
    uniqueChannels.length > 0
      ? `Communications: ${uniqueChannels.join(", ")}.`
      : null,
    artworkLine,
    closingLine,
  ].filter(Boolean);

  return {
    headline: event.title,
    introLine,
    channelHighlights: uniqueChannels,
    artworkLine,
    closingLine,
    narrative: narrativeParts.join(" "),
  };
}
