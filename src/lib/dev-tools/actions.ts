"use server";

import { revalidatePath } from "next/cache";
import { requireDeveloperClearAccess } from "@/lib/dev-tools/access";
import { CAMPAIGN_CLEAR_CONFIRM_TOKEN } from "@/lib/dev-tools/constants";
import {
  clearGeneratedContentForScope,
  type ClearGeneratedContentResult,
} from "@/lib/dev-tools/clear-generated-content-server";
import { canUseDeveloperClearTools } from "@/lib/dev-tools/access";

export async function canUseDeveloperClearToolsAction(): Promise<boolean> {
  return canUseDeveloperClearTools();
}

export async function clearMilestoneGeneratedContentAction(input: {
  organizationId: string;
  eventId: string;
  milestoneId: string;
}): Promise<ClearGeneratedContentResult> {
  const access = await requireDeveloperClearAccess();
  if (!access.allowed || !access.userId || !access.organizationId) {
    return {
      success: false,
      message: access.message ?? "Not allowed.",
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  if (input.organizationId !== access.organizationId) {
    return {
      success: false,
      message: "Organization mismatch.",
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  if (!input.milestoneId.trim()) {
    return {
      success: false,
      message: "Milestone ID is required.",
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  const result = await clearGeneratedContentForScope({
    organizationId: access.organizationId,
    eventId: input.eventId,
    milestoneIds: [input.milestoneId],
    userId: access.userId,
    actionType: "clear_milestone_generated_content",
  });

  if (result.success) {
    revalidatePath(`/events/${input.eventId}/campaign-builder`);
    revalidatePath("/approvals");
  }

  return result;
}

export async function clearCampaignGeneratedContentAction(input: {
  organizationId: string;
  eventId: string;
  confirmToken: string;
}): Promise<ClearGeneratedContentResult> {
  const access = await requireDeveloperClearAccess();
  if (!access.allowed || !access.userId || !access.organizationId) {
    return {
      success: false,
      message: access.message ?? "Not allowed.",
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  if (input.organizationId !== access.organizationId) {
    return {
      success: false,
      message: "Organization mismatch.",
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  if (input.confirmToken.trim() !== CAMPAIGN_CLEAR_CONFIRM_TOKEN) {
    return {
      success: false,
      message: `Type ${CAMPAIGN_CLEAR_CONFIRM_TOKEN} to confirm.`,
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  const result = await clearGeneratedContentForScope({
    organizationId: access.organizationId,
    eventId: input.eventId,
    milestoneIds: "all",
    userId: access.userId,
    actionType: "clear_campaign_generated_content",
  });

  if (result.success) {
    revalidatePath(`/events/${input.eventId}/campaign-builder`);
    revalidatePath("/approvals");
    revalidatePath("/settings/advanced");
  }

  return result;
}
