"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canApproveDraft } from "@/lib/auth/campaign-roles";
import * as campaignAssetPermissions from "@/lib/creative-assets/permissions";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { ensureMetaMilestoneApprovalRequest } from "@/lib/event-workspace/meta-approval-sync";
import { getApprovalActorFromSession } from "@/lib/event-workspace/get-approval-actor";
import { syncMetaPublicationSlots } from "@/lib/meta-publishing/sync-slots";
import {
  generateAllMetaSocialCaptions,
  generateMetaSocialCaption,
  syncStoryFromFeedCaption,
} from "@/lib/meta-captions/generation";
import { resolveSocialMetaMilestonesForEvent } from "@/lib/campaign-plan/resolve-plan-milestones";
import {
  getCaptionForMilestone,
  getMetaSocialCaptionsForEvent,
  updateMetaSocialCaptionStatus,
  upsertMetaSocialCaption,
} from "@/lib/meta-captions/queries";
import { getEventById } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  MetaSocialCaptionActionResult,
  MetaSocialCaptionPlacement,
} from "@/lib/meta-captions/types";

function revalidateCaptionPaths(eventId: string): void {
  void syncMetaPublicationSlots(eventId);
  revalidatePath("/creative-studio");
  revalidateEventPaths(eventId);
}

async function resolveMilestone(
  eventId: string,
  relativeDay: number,
) {
  const milestones = await resolveSocialMetaMilestonesForEvent(eventId);
  return milestones.find((entry) => entry.relativeDay === relativeDay);
}

async function maybeAutoSyncStoryFromFeed(input: {
  eventId: string;
  relativeDay: number;
  feedCaption: string;
}): Promise<void> {
  const event = await getEventById(input.eventId);
  if (!event) {
    return;
  }

  const milestone = await resolveMilestone(input.eventId, input.relativeDay);
  if (!milestone) {
    return;
  }

  const captions = await getMetaSocialCaptionsForEvent(input.eventId);
  const story = getCaptionForMilestone(captions, input.relativeDay, "story");

  if (story?.status === "approved") {
    return;
  }

  await syncStoryFromFeedCaption({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
    milestoneTitle: milestone.title,
    feedCaption: input.feedCaption,
  });
}

export async function generateMetaSocialCaptionAction(
  eventId: string,
  relativeDay: number,
  placement: MetaSocialCaptionPlacement,
): Promise<MetaSocialCaptionActionResult> {
  const role = await getCurrentCampaignRole();
  if (!campaignAssetPermissions.canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to generate captions." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const milestone = await resolveMilestone(eventId, relativeDay);
  if (!milestone) {
    return { success: false, error: "Milestone not found." };
  }

  let existingFeedCaption: string | null = null;
  if (placement === "story") {
    const captions = await getMetaSocialCaptionsForEvent(eventId);
    existingFeedCaption =
      getCaptionForMilestone(captions, relativeDay, "feed")?.content ?? null;
  }

  const result = await generateMetaSocialCaption({
    eventId,
    relativeDay,
    milestoneTitle: milestone.title,
    placement,
    existingFeedCaption,
  });

  if (result.success && placement === "feed" && result.content) {
    await maybeAutoSyncStoryFromFeed({
      eventId,
      relativeDay,
      feedCaption: result.content,
    });
  }

  if (result.success) {
    revalidateCaptionPaths(eventId);
  }

  return result;
}

export async function generateAllMetaSocialCaptionsAction(
  eventId: string,
): Promise<MetaSocialCaptionActionResult> {
  const role = await getCurrentCampaignRole();
  if (!campaignAssetPermissions.canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to generate captions." };
  }

  const result = await generateAllMetaSocialCaptions(eventId);

  if (result.success) {
    revalidateCaptionPaths(eventId);
  }

  return result;
}

export async function saveMetaSocialCaptionAction(
  eventId: string,
  relativeDay: number,
  placement: MetaSocialCaptionPlacement,
  content: string,
): Promise<MetaSocialCaptionActionResult> {
  const role = await getCurrentCampaignRole();
  if (!campaignAssetPermissions.canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to edit captions." };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Caption cannot be empty." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const milestone = await resolveMilestone(eventId, relativeDay);
  if (!milestone) {
    return { success: false, error: "Milestone not found." };
  }

  const saved = await upsertMetaSocialCaption({
    eventId,
    relativeDay,
    milestoneTitle: milestone.title,
    placement,
    content: trimmed,
    status: "draft",
  });

  if (!saved.success) {
    return { success: false, error: saved.error ?? "Could not save caption." };
  }

  if (placement === "feed") {
    await maybeAutoSyncStoryFromFeed({
      eventId,
      relativeDay,
      feedCaption: trimmed,
    });
  }

  revalidateCaptionPaths(eventId);
  return { success: true, content: trimmed };
}

export async function syncStoryFromFeedCaptionAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaSocialCaptionActionResult> {
  const role = await getCurrentCampaignRole();
  if (!campaignAssetPermissions.canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to generate captions." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const milestone = await resolveMilestone(eventId, relativeDay);
  if (!milestone) {
    return { success: false, error: "Milestone not found." };
  }

  const captions = await getMetaSocialCaptionsForEvent(eventId);
  const feedCaption = getCaptionForMilestone(captions, relativeDay, "feed")?.content;

  if (!feedCaption?.trim()) {
    return { success: false, error: "Draft a feed caption first." };
  }

  const story = getCaptionForMilestone(captions, relativeDay, "story");
  if (story?.status === "approved") {
    return { success: false, error: "Unapprove the story caption before syncing." };
  }

  const result = await syncStoryFromFeedCaption({
    eventId,
    relativeDay,
    milestoneTitle: milestone.title,
    feedCaption,
  });

  if (result.success) {
    revalidateCaptionPaths(eventId);
  }

  return result;
}

export async function approveMetaSocialCaptionAction(
  eventId: string,
  relativeDay: number,
  placement: MetaSocialCaptionPlacement,
): Promise<MetaSocialCaptionActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canApproveDraft(role)) {
    return { success: false, error: "You do not have permission to approve captions." };
  }

  const captions = await getMetaSocialCaptionsForEvent(eventId);
  const caption = getCaptionForMilestone(captions, relativeDay, placement);

  if (!caption?.content?.trim()) {
    return { success: false, error: "Draft a caption before approving." };
  }

  const updated = await updateMetaSocialCaptionStatus({
    eventId,
    relativeDay,
    placement,
    status: "approved",
  });

  if (!updated.success) {
    return { success: false, error: updated.error ?? "Could not approve caption." };
  }

  const refreshedCaptions = await getMetaSocialCaptionsForEvent(eventId);
  const feed = getCaptionForMilestone(refreshedCaptions, relativeDay, "feed");
  const story = getCaptionForMilestone(refreshedCaptions, relativeDay, "story");
  if (
    feed?.status === "approved" &&
    story?.status === "approved" &&
    feed.content?.trim() &&
    story.content?.trim()
  ) {
    const actor = await getApprovalActorFromSession();
    await ensureMetaMilestoneApprovalRequest(eventId, relativeDay, actor);
  }

  revalidateCaptionPaths(eventId);
  return { success: true, content: caption.content };
}

export async function unapproveMetaSocialCaptionAction(
  eventId: string,
  relativeDay: number,
  placement: MetaSocialCaptionPlacement,
): Promise<MetaSocialCaptionActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canApproveDraft(role)) {
    return { success: false, error: "You do not have permission to unapprove captions." };
  }

  const captions = await getMetaSocialCaptionsForEvent(eventId);
  const caption = getCaptionForMilestone(captions, relativeDay, placement);

  if (!caption || caption.status !== "approved") {
    return { success: false, error: "This caption is not approved." };
  }

  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("meta_publication_slots")
    .select("status")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay);

  const blocked = (slots ?? []).some((slot) =>
    ["published", "posting"].includes(slot.status as string),
  );
  if (blocked) {
    return {
      success: false,
      error: "Cannot unapprove — this milestone has already published or is posting.",
    };
  }

  const updated = await updateMetaSocialCaptionStatus({
    eventId,
    relativeDay,
    placement,
    status: "draft",
  });

  if (!updated.success) {
    return { success: false, error: updated.error ?? "Could not unapprove caption." };
  }

  const now = new Date().toISOString();
  await supabase
    .from("meta_publication_slots")
    .update({ status: "draft", updated_at: now })
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .in("status", ["scheduled", "approved"]);

  revalidateCaptionPaths(eventId);
  return { success: true, content: caption.content };
}

export async function unapproveMilestoneCaptionsAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaSocialCaptionActionResult> {
  for (const placement of ["feed", "story"] as const) {
    const captions = await getMetaSocialCaptionsForEvent(eventId);
    const caption = getCaptionForMilestone(captions, relativeDay, placement);
    if (caption?.status === "approved") {
      const result = await unapproveMetaSocialCaptionAction(eventId, relativeDay, placement);
      if (!result.success) {
        return result;
      }
    }
  }

  revalidateCaptionPaths(eventId);
  return { success: true };
}

export async function approveMilestoneCaptionsAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaSocialCaptionActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canApproveDraft(role)) {
    return { success: false, error: "You do not have permission to approve captions." };
  }

  const captions = await getMetaSocialCaptionsForEvent(eventId);
  const feed = getCaptionForMilestone(captions, relativeDay, "feed");
  const story = getCaptionForMilestone(captions, relativeDay, "story");

  if (!feed?.content?.trim()) {
    return { success: false, error: "Draft a feed caption before approving this milestone." };
  }

  if (!story?.content?.trim()) {
    return { success: false, error: "Draft a story caption before approving this milestone." };
  }

  for (const placement of ["feed", "story"] as const) {
    const result = await approveMetaSocialCaptionAction(eventId, relativeDay, placement);
    if (!result.success) {
      return result;
    }
  }

  const actor = await getApprovalActorFromSession();
  await ensureMetaMilestoneApprovalRequest(eventId, relativeDay, actor);

  revalidateCaptionPaths(eventId);
  return { success: true };
}
