"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { ensureMetaMilestoneApprovalRequest } from "@/lib/event-workspace/meta-approval-sync";
import { getApprovalActorFromSession } from "@/lib/event-workspace/get-approval-actor";
import { getMetaPublishBundles } from "@/lib/meta-publishing/bundles";
import { publishDueMetaMilestonesForEvent } from "@/lib/meta-publishing/publish-due";
import { publishMetaMilestoneBundle } from "@/lib/meta-publishing/publish-milestone";
import {
  getMetaPublicationSlotsForEvent,
  syncMetaPublicationSlots,
} from "@/lib/meta-publishing/sync-slots";
import type { MetaPublishActionResult } from "@/lib/meta-publishing/types";
import { createClient } from "@/lib/supabase/server";

function revalidateMetaPaths(eventId: string): void {
  revalidatePath("/creative-studio");
  revalidateEventPaths(eventId);
}

async function updateSlotsForMilestones(input: {
  eventId: string;
  relativeDays: number[];
  status: "scheduled" | "approved";
  scheduledFor?: string | null;
}): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let fromStatuses: string[] | null = null;
  if (input.status === "scheduled") {
    fromStatuses = ["draft"];
  } else if (input.status === "approved") {
    fromStatuses = ["scheduled"];
  }

  let query = supabase
    .from("meta_publication_slots")
    .update({
      status: input.status,
      updated_at: now,
      ...(input.scheduledFor ? { scheduled_for: input.scheduledFor } : {}),
    })
    .eq("event_id", input.eventId)
    .in("relative_day", input.relativeDays);

  if (fromStatuses) {
    query = query.in("status", fromStatuses);
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error("Failed to update meta publication slots:", error.message);
    return 0;
  }

  return data?.length ?? 0;
}

async function prepareMetaBundlesForImmediatePublish(input: {
  eventId: string;
  relativeDays: number[];
}): Promise<number> {
  if (input.relativeDays.length === 0) {
    return 0;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("meta_publication_slots")
    .update({
      status: "approved",
      scheduled_for: now,
      updated_at: now,
    })
    .eq("event_id", input.eventId)
    .in("relative_day", input.relativeDays)
    .in("status", ["draft", "scheduled", "approved", "failed"])
    .select("id");

  if (error) {
    console.error("Failed to prepare meta bundles for publish:", error.message);
    return 0;
  }

  return data?.length ?? 0;
}

export async function publishMetaBundleNowAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to publish posts." };
  }

  await syncMetaPublicationSlots(eventId);
  const bundle = (await getMetaPublishBundles(eventId)).find(
    (entry) => entry.relativeDay === relativeDay,
  );

  if (!bundle) {
    return { success: false, error: "Milestone not found." };
  }

  if (["needs_artwork", "needs_caption", "skipped", "published", "posting"].includes(bundle.status)) {
    return {
      success: false,
      error:
        bundle.status === "needs_artwork"
          ? "Approve feed and story artwork before publishing."
          : bundle.status === "needs_caption"
            ? "Approve social captions in Schedule before publishing."
            : "This milestone cannot be published right now.",
    };
  }

  await prepareMetaBundlesForImmediatePublish({
    eventId,
    relativeDays: [relativeDay],
  });

  const result = await publishMetaMilestoneBundle({ eventId, relativeDay });

  revalidateMetaPaths(eventId);
  return {
    success: result.success,
    publishedCount: result.publishedCount,
    failedCount: result.failedCount,
    updatedCount: result.publishedCount,
    error: result.error,
  };
}

export async function publishAllActionableMetaBundlesNowAction(
  eventId: string,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to publish posts." };
  }

  await syncMetaPublicationSlots(eventId);
  const bundles = await getMetaPublishBundles(eventId);
  const actionable = bundles.filter((bundle) =>
    ["ready", "scheduled", "approved", "failed"].includes(bundle.status),
  );

  if (actionable.length === 0) {
    return {
      success: false,
      error:
        "Nothing ready to publish yet. In Schedule, approve artwork + social captions, then return here.",
    };
  }

  await prepareMetaBundlesForImmediatePublish({
    eventId,
    relativeDays: actionable.map((bundle) => bundle.relativeDay),
  });

  let publishedCount = 0;
  let failedCount = 0;
  let firstError: string | null = null;

  for (const bundle of actionable) {
    const result = await publishMetaMilestoneBundle({
      eventId,
      relativeDay: bundle.relativeDay,
    });

    if (result.success) {
      publishedCount += result.publishedCount;
    } else {
      failedCount += 1;
      firstError ??= result.error ?? "Publish failed.";
    }
  }

  revalidateMetaPaths(eventId);
  return {
    success: failedCount === 0 && publishedCount > 0,
    publishedCount,
    failedCount,
    updatedCount: publishedCount,
    error:
      failedCount > 0
        ? (firstError ?? "Some milestones failed to publish.")
        : publishedCount > 0
          ? null
          : "Unable to publish milestones.",
  };
}

export async function scheduleAllReadyMetaBundlesAction(
  eventId: string,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to schedule posts." };
  }

  await syncMetaPublicationSlots(eventId);
  const bundles = await getMetaPublishBundles(eventId);
  const readyBundles = bundles.filter((bundle) => bundle.status === "ready");

  if (readyBundles.length === 0) {
    return {
      success: false,
      error: "No milestones are ready yet. Approve feed + story artwork and captions first.",
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  let updatedCount = 0;

  for (const bundle of readyBundles) {
    const scheduledFor = bundle.scheduledFor ?? bundle.dueDate;
    if (!scheduledFor) {
      continue;
    }

    const { error } = await supabase
      .from("meta_publication_slots")
      .update({
        status: "scheduled",
        scheduled_for: scheduledFor,
        updated_at: now,
      })
      .eq("event_id", eventId)
      .eq("relative_day", bundle.relativeDay)
      .in("status", ["draft"]);

    if (!error) {
      updatedCount += 1;
      const actor = await getApprovalActorFromSession();
      await ensureMetaMilestoneApprovalRequest(eventId, bundle.relativeDay, actor);
    }
  }

  revalidateMetaPaths(eventId);
  return {
    success: updatedCount > 0,
    updatedCount,
    error: updatedCount > 0 ? null : "Unable to schedule milestones.",
  };
}

export async function approveAllScheduledMetaBundlesAction(
  eventId: string,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to approve posts." };
  }

  const bundles = await getMetaPublishBundles(eventId);
  const scheduledDays = bundles
    .filter((bundle) => bundle.status === "scheduled")
    .map((bundle) => bundle.relativeDay);

  if (scheduledDays.length === 0) {
    return { success: false, error: "Nothing scheduled yet. Use Schedule all ready first." };
  }

  const updatedCount = await updateSlotsForMilestones({
    eventId,
    relativeDays: scheduledDays,
    status: "approved",
  });

  if (updatedCount > 0) {
    await publishDueMetaMilestonesForEvent(eventId);
  }

  revalidateMetaPaths(eventId);
  return {
    success: updatedCount > 0,
    updatedCount,
    error: updatedCount > 0 ? null : "Unable to approve scheduled milestones.",
  };
}

export async function publishAllApprovedMetaBundlesAction(
  eventId: string,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to publish posts." };
  }

  const bundles = await getMetaPublishBundles(eventId);
  const toPublish = bundles.filter(
    (bundle) => bundle.status === "approved" || bundle.status === "failed",
  );

  if (toPublish.length === 0) {
    return {
      success: false,
      error: "No approved milestones waiting to publish.",
    };
  }

  let publishedCount = 0;
  let failedCount = 0;
  let firstError: string | null = null;

  for (const bundle of toPublish) {
    const result = await publishMetaMilestoneBundle({
      eventId,
      relativeDay: bundle.relativeDay,
    });

    if (result.success) {
      publishedCount += result.publishedCount;
    } else {
      failedCount += 1;
      firstError ??= result.error ?? "Publish failed.";
    }
  }

  revalidateMetaPaths(eventId);
  return {
    success: failedCount === 0 && publishedCount > 0,
    publishedCount,
    failedCount,
    updatedCount: publishedCount,
    error:
      failedCount > 0
        ? (firstError ?? "Some milestones failed to publish.")
        : publishedCount > 0
          ? null
          : "Unable to publish milestones.",
  };
}

export async function scheduleMetaBundleAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to schedule posts." };
  }

  await syncMetaPublicationSlots(eventId);
  const bundle = (await getMetaPublishBundles(eventId)).find(
    (entry) => entry.relativeDay === relativeDay,
  );

  if (!bundle) {
    return { success: false, error: "Milestone not found." };
  }

  if (bundle.status !== "ready") {
    return { success: false, error: "This milestone is not ready to schedule yet." };
  }

  const updatedCount = await updateSlotsForMilestones({
    eventId,
    relativeDays: [relativeDay],
    status: "scheduled",
    scheduledFor: bundle.scheduledFor,
  });

  if (updatedCount > 0) {
    const actor = await getApprovalActorFromSession();
    await ensureMetaMilestoneApprovalRequest(eventId, relativeDay, actor);
  }

  revalidateMetaPaths(eventId);
  return {
    success: updatedCount > 0,
    updatedCount,
    error: updatedCount > 0 ? null : "Unable to schedule this milestone.",
  };
}

export async function publishMetaBundleAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to publish posts." };
  }

  const result = await publishMetaMilestoneBundle({ eventId, relativeDay });

  revalidateMetaPaths(eventId);
  return {
    success: result.success,
    publishedCount: result.publishedCount,
    failedCount: result.failedCount,
    updatedCount: result.publishedCount,
    error: result.error,
  };
}

export async function retryFailedMetaBundleAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  return publishMetaBundleAction(eventId, relativeDay);
}

export async function runDueMetaPublishForEventAction(
  eventId: string,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to publish posts." };
  }

  const result = await publishDueMetaMilestonesForEvent(eventId);
  revalidateMetaPaths(eventId);

  return {
    success: result.failedBundles === 0 && result.publishedBundles > 0,
    publishedCount: result.publishedBundles,
    failedCount: result.failedBundles,
    updatedCount: result.publishedBundles,
    error: result.errors[0] ?? (result.publishedBundles === 0 ? "Nothing due to publish yet." : null),
  };
}

export async function skipMetaPublishMilestoneAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to skip posts." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: step, error: stepLookupError } = await supabase
    .from("event_communication_steps")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  if (stepLookupError) {
    return { success: false, error: stepLookupError.message };
  }

  const { data: slots, error: lookupError } = await supabase
    .from("meta_publication_slots")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay);

  if (lookupError) {
    return { success: false, error: lookupError.message };
  }

  if (!step?.id && !slots?.length) {
    return { success: false, error: "Milestone not found." };
  }

  const blocked = slots?.some((slot) =>
    ["published", "posting"].includes(slot.status as string),
  );
  if (blocked) {
    return {
      success: false,
      error: "Cannot skip — this milestone has already published or is posting.",
    };
  }

  let slotsUpdated = 0;
  if (slots?.length) {
    const { data, error } = await supabase
      .from("meta_publication_slots")
      .update({ status: "cancelled", updated_at: now })
      .eq("event_id", eventId)
      .eq("relative_day", relativeDay)
      .in("status", ["draft", "scheduled", "approved", "failed"])
      .select("id");

    if (error) {
      return { success: false, error: error.message };
    }

    slotsUpdated = data?.length ?? 0;
  }

  let stepUpdated = false;
  if (step?.id && step.status !== "skipped") {
    const { error: stepError } = await supabase
      .from("event_communication_steps")
      .update({ status: "skipped", updated_at: now })
      .eq("id", step.id);

    if (stepError) {
      return { success: false, error: stepError.message };
    }

    stepUpdated = true;
  }

  revalidateMetaPaths(eventId);
  return {
    success: stepUpdated || slotsUpdated > 0 || step?.status === "skipped",
    updatedCount: slotsUpdated + (stepUpdated ? 1 : 0),
    error:
      stepUpdated || slotsUpdated > 0 || step?.status === "skipped"
        ? null
        : "Unable to skip this milestone.",
  };
}

export async function unskipMetaPublishMilestoneAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to restore posts." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: step, error: stepLookupError } = await supabase
    .from("event_communication_steps")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  if (stepLookupError) {
    return { success: false, error: stepLookupError.message };
  }

  if (!step?.id || step.status !== "skipped") {
    return { success: false, error: "This milestone is not skipped." };
  }

  let slotsUpdated = 0;
  const { data, error } = await supabase
    .from("meta_publication_slots")
    .update({ status: "draft", updated_at: now })
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .eq("status", "cancelled")
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  slotsUpdated = data?.length ?? 0;

  const { error: stepError } = await supabase
    .from("event_communication_steps")
    .update({ status: "upcoming", updated_at: now })
    .eq("id", step.id);

  if (stepError) {
    return { success: false, error: stepError.message };
  }

  revalidateMetaPaths(eventId);
  return {
    success: true,
    updatedCount: slotsUpdated + 1,
    error: null,
  };
}

/** Used by cron — no permission check. */
export async function getApprovedSlotCount(eventId: string): Promise<number> {
  const slots = await getMetaPublicationSlotsForEvent(eventId);
  return slots.filter((slot) => slot.status === "approved").length;
}
