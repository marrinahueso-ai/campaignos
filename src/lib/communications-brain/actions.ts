"use server";

import { revalidatePath } from "next/cache";
import {
  generateAllDraftsForEvent,
  generateDraftForStep,
  updateStepDraftContent,
} from "@/lib/communications-brain/mutations";
import { DraftPerformanceTracker } from "@/lib/ai/draft-performance";

export interface BrainActionState {
  error: string | null;
  success: boolean;
}

export async function generateStepDraftAction(
  eventId: string,
  stepId: string,
): Promise<BrainActionState> {
  const performance = DraftPerformanceTracker.markActionReceived();
  const result = await generateDraftForStep(eventId, stepId, performance);

  if (!result.success) {
    performance.printSummary();
    return {
      error:
        result.error ??
        "Unable to generate draft. Assign a playbook with saved timeline steps first.",
      success: false,
    };
  }

  await performance.time("revalidate", async () => {
    revalidatePath(`/events/${eventId}`);
  });
  performance.printSummary();
  return { error: null, success: true };
}

export async function generateAllDraftsAction(
  eventId: string,
): Promise<BrainActionState & { generated?: number }> {
  const result = await generateAllDraftsForEvent(eventId);

  if (result.generated === 0 && result.failed > 0) {
    return {
      error: "Unable to generate drafts for this event.",
      success: false,
    };
  }

  revalidatePath(`/events/${eventId}`);
  return {
    error: null,
    success: true,
    generated: result.generated,
  };
}

export async function updateStepDraftAction(
  communicationItemId: string,
  eventId: string,
  content: string,
): Promise<BrainActionState> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Draft content cannot be empty.", success: false };
  }

  const success = await updateStepDraftContent(
    communicationItemId,
    eventId,
    trimmed,
  );

  if (!success) {
    return { error: "Unable to save draft edits.", success: false };
  }

  revalidatePath(`/events/${eventId}`);
  return { error: null, success: true };
}
