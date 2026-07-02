import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { PLACEHOLDER_COMMUNICATION_CONTENT } from "@/lib/event-workspace/constants";
import type { CommunicationChannel } from "@/types/event-workspace";

const PLACEHOLDER_VALUES = new Set(
  Object.values(PLACEHOLDER_COMMUNICATION_CONTENT).map((value) => value.trim()),
);

export function isLegacyPlaceholderContent(content: string | null | undefined): boolean {
  if (!content?.trim()) return false;
  return PLACEHOLDER_VALUES.has(content.trim());
}

export function displayDraftContent(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  if (isLegacyPlaceholderContent(content)) return null;
  return content;
}

export function channelLabel(channel: CommunicationChannel): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel.replaceAll("_", " ")
  );
}
