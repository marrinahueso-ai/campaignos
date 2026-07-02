"use server";

import { revalidatePath } from "next/cache";
import { draftCommunicationWithAi } from "@/lib/ai/draft";
import { generateEventBrief } from "@/lib/ai/event-brief";
import { DraftPerformanceTracker } from "@/lib/ai/draft-performance";
import type { EventBriefInput, GenerateEventBriefActionState } from "@/lib/ai/types";
import type { CommunicationChannel } from "@/types/event-workspace";

export type AiDraftActionState = {
  success: boolean;
  error: string | null;
  draftText: string | null;
  strategyExplanation: string | null;
  versionNumber: number | null;
};

export async function draftCommunicationWithAiAction(
  eventId: string,
  communicationItemId: string,
  channel: CommunicationChannel,
  instructions?: string | null,
): Promise<AiDraftActionState> {
  const performance = DraftPerformanceTracker.markActionReceived();

  const result = await draftCommunicationWithAi({
    eventId,
    communicationItemId,
    channel,
    instructions,
    performance,
  });

  if (result.success) {
    await performance.time("revalidate", async () => {
      revalidatePath(`/events/${eventId}`);
    });
    performance.printSummary();
    return {
      success: true,
      error: null,
      draftText: result.draftText,
      strategyExplanation: result.strategyExplanation,
      versionNumber: result.versionNumber,
    };
  }

  performance.printSummary();
  return {
    success: false,
    error: result.error,
    draftText: null,
    strategyExplanation: null,
    versionNumber: null,
  };
}

export async function generateEventBriefAction(
  input: EventBriefInput,
  eventId?: string | null,
): Promise<GenerateEventBriefActionState> {
  return generateEventBrief({ eventId: eventId ?? null, briefInput: input });
}
