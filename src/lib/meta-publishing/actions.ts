"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { ensureMetaMilestoneApprovalRequest } from "@/lib/event-workspace/meta-approval-sync";
import { getApprovalActorFromSession } from "@/lib/event-workspace/get-approval-actor";
import { getMetaPublishBundles, bundleHasAutoPublishTargets, bundleIsManualStoryOnly, bundleIsSchedulable } from "@/lib/meta-publishing/bundles";
import { publishDueMetaMilestonesForEvent } from "@/lib/meta-publishing/publish-due";
import { publishMetaMilestoneBundle } from "@/lib/meta-publishing/publish-milestone";
import {
  publishModeToDb,
  surfacesNeedManualStoryEmail,
  type MetaPublishMode,
} from "@/lib/meta-publishing/publish-mode";
import { sendStoryPostKitForMilestone } from "@/lib/meta-publishing/send-story-post-kit";
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
    fromStatuses = ["draft", "scheduled", "approved", "failed"];
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

async function sendManualStoryPostKitIfNeeded(
  eventId: string,
  relativeDay: number,
  bundle: Awaited<ReturnType<typeof getMetaPublishBundles>>[number],
): Promise<string | null> {
  if (!surfacesNeedManualStoryEmail(bundle.metaPublishSurfaces, bundle.storyManualPublish)) {
    return null;
  }

  const emailResult = await sendStoryPostKitForMilestone({
    eventId,
    relativeDay,
    forceResend: true,
  });

  if (!emailResult.success && !emailResult.skipped) {
    return emailResult.error ?? "Story post kit email failed to send.";
  }

  return null;
}

async function scheduleManualStoryOnlyBundle(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  const bundle = (await getMetaPublishBundles(eventId)).find(
    (entry) => entry.relativeDay === relativeDay,
  );

  if (!bundle || !bundleIsManualStoryOnly(bundle)) {
    return { success: false, error: "Milestone not found." };
  }

  if (!bundleIsSchedulable(bundle)) {
    return { success: false, error: "This milestone is not ready to schedule yet." };
  }

  const emailError = await sendManualStoryPostKitIfNeeded(eventId, relativeDay, bundle);
  if (emailError) {
    return { success: false, error: emailError };
  }

  const actor = await getApprovalActorFromSession();
  await ensureMetaMilestoneApprovalRequest(eventId, relativeDay, actor);

  revalidateMetaPaths(eventId);
  return { success: true, updatedCount: 1, error: null };
}

async function publishManualStoryOnlyBundle(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  const supabase = await createClient();
  const bundle = (await getMetaPublishBundles(eventId)).find(
    (entry) => entry.relativeDay === relativeDay,
  );

  if (!bundle || !bundleIsManualStoryOnly(bundle)) {
    return { success: false, error: "Milestone not found." };
  }

  if (!["ready", "scheduled"].includes(bundle.status)) {
    return {
      success: false,
      error: "This milestone cannot be confirmed for manual posting right now.",
    };
  }

  const emailError = await sendManualStoryPostKitIfNeeded(eventId, relativeDay, bundle);
  if (emailError) {
    return { success: false, error: emailError };
  }

  const { data: step } = await supabase
    .from("event_communication_steps")
    .select("id")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  if (step?.id) {
    const now = new Date().toISOString();
    await supabase
      .from("event_communication_steps")
      .update({ status: "completed", completed_at: now, updated_at: now })
      .eq("id", step.id);
  }

  revalidateMetaPaths(eventId);
  return { success: true, updatedCount: 1, publishedCount: 0, error: null };
}

export async function publishMetaBundleNowAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to publish posts." };
  }

  const bundle = (await getMetaPublishBundles(eventId)).find(
    (entry) => entry.relativeDay === relativeDay,
  );

  if (!bundle) {
    return { success: false, error: "Milestone not found." };
  }

  if (["skipped", "published", "posting"].includes(bundle.status)) {
    return {
      success: false,
      error: "This milestone cannot be published right now.",
    };
  }

  if (!bundleIsSchedulable(bundle)) {
    return {
      success: false,
      error:
        bundle.status === "needs_artwork"
          ? "Approve required artwork before publishing."
          : bundle.status === "needs_caption"
            ? "Approve social captions in Schedule before publishing."
            : "This milestone is not ready to publish yet.",
    };
  }

  if (bundleIsManualStoryOnly(bundle)) {
    return publishManualStoryOnlyBundle(eventId, relativeDay);
  }

  const result = await publishMetaMilestoneBundle({
    eventId,
    relativeDay,
    immediate: true,
  });

  if (result.success && surfacesNeedManualStoryEmail(bundle.metaPublishSurfaces, bundle.storyManualPublish)) {
    const emailError = await sendManualStoryPostKitIfNeeded(eventId, relativeDay, bundle);
    if (emailError) {
      revalidateMetaPaths(eventId);
      return {
        success: true,
        publishedCount: result.publishedCount,
        failedCount: result.failedCount,
        updatedCount: result.publishedCount,
        error: `Feed published, but story post kit email failed: ${emailError}`,
      };
    }
  }

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
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to publish posts." };
  }

  const bundles = await getMetaPublishBundles(eventId);
  const actionable = bundles.filter(
    (bundle) =>
      bundleHasAutoPublishTargets(bundle) &&
      ["ready", "scheduled", "approved", "failed"].includes(bundle.status),
  );

  if (actionable.length === 0) {
    return {
      success: false,
      error:
        "Nothing ready to publish yet. In Schedule, approve artwork + social captions, then return here.",
    };
  }

  let publishedCount = 0;
  let failedCount = 0;
  let firstError: string | null = null;

  for (const bundle of actionable) {
    const result = await publishMetaMilestoneBundle({
      eventId,
      relativeDay: bundle.relativeDay,
      immediate: true,
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
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to schedule posts." };
  }

  await syncMetaPublicationSlots(eventId);
  const bundles = await getMetaPublishBundles(eventId);
  const readyBundles = bundles.filter((bundle) => bundleIsSchedulable(bundle));

  if (readyBundles.length === 0) {
    return {
      success: false,
      error: "No milestones are ready yet. Approve required artwork and captions first.",
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  let updatedCount = 0;

  for (const bundle of readyBundles) {
    if (bundleIsManualStoryOnly(bundle)) {
      const manualResult = await scheduleManualStoryOnlyBundle(eventId, bundle.relativeDay);
      if (manualResult.success) {
        updatedCount += 1;
      }
      continue;
    }

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
      await sendManualStoryPostKitIfNeeded(eventId, bundle.relativeDay, bundle);
    }
  }

  revalidateMetaPaths(eventId);
  return {
    success: updatedCount > 0,
    updatedCount,
    error: updatedCount > 0 ? null : "Unable to schedule milestones.",
  };
}

export async function scheduleMetaBundlesAtAction(
  eventId: string,
  scheduledFor: string,
  relativeDays?: number[],
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to schedule posts." };
  }

  if (!scheduledFor) {
    return { success: false, error: "Choose a valid date and time." };
  }

  await syncMetaPublicationSlots(eventId);
  const bundles = await getMetaPublishBundles(eventId);
  const readyBundles = bundles.filter((bundle) => {
    if (!bundleIsSchedulable(bundle)) {
      return false;
    }

    if (relativeDays && relativeDays.length > 0) {
      return relativeDays.includes(bundle.relativeDay);
    }

    return true;
  });

  if (readyBundles.length === 0) {
    return {
      success: false,
      error: "No milestones are ready yet. Approve required artwork and captions first.",
    };
  }

  let updatedCount = 0;

  for (const bundle of readyBundles) {
    if (bundleIsManualStoryOnly(bundle)) {
      const manualResult = await scheduleManualStoryOnlyBundle(eventId, bundle.relativeDay);
      if (manualResult.success) {
        updatedCount += 1;
      }
      continue;
    }

    const count = await updateSlotsForMilestones({
      eventId,
      relativeDays: [bundle.relativeDay],
      status: "scheduled",
      scheduledFor,
    });

    if (count > 0) {
      updatedCount += count;
      const actor = await getApprovalActorFromSession();
      await ensureMetaMilestoneApprovalRequest(eventId, bundle.relativeDay, actor);
      await sendManualStoryPostKitIfNeeded(eventId, bundle.relativeDay, bundle);
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
  if (!(await hasPermission("publish_social"))) {
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
  if (!(await hasPermission("publish_social"))) {
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
      immediate: true,
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

export async function unscheduleMetaBundleAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to unschedule posts." };
  }

  const bundle = (await getMetaPublishBundles(eventId)).find(
    (entry) => entry.relativeDay === relativeDay,
  );

  if (!bundle) {
    return { success: false, error: "Milestone not found." };
  }

  if (!["scheduled", "approved"].includes(bundle.status)) {
    return { success: false, error: "This milestone is not scheduled." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (bundleIsManualStoryOnly(bundle)) {
    if (!bundle.stepId) {
      return { success: false, error: "Unable to unschedule this milestone." };
    }

    const { error } = await supabase
      .from("event_communication_steps")
      .update({ story_reminder_sent_at: null, updated_at: now })
      .eq("id", bundle.stepId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateMetaPaths(eventId);
    return { success: true, updatedCount: 1, error: null };
  }

  const { data: slots, error: lookupError } = await supabase
    .from("meta_publication_slots")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay);

  if (lookupError) {
    return { success: false, error: lookupError.message };
  }

  const blocked = slots?.some((slot) =>
    ["published", "posting"].includes(slot.status as string),
  );
  if (blocked) {
    return {
      success: false,
      error: "Cannot unschedule — this milestone has already published or is posting.",
    };
  }

  const schedulableSlots = slots?.filter((slot) =>
    ["scheduled", "approved"].includes(slot.status as string),
  );

  if (!schedulableSlots?.length) {
    return { success: false, error: "Nothing scheduled to unschedule." };
  }

  const { data, error } = await supabase
    .from("meta_publication_slots")
    .update({
      status: "draft",
      scheduled_for: null,
      updated_at: now,
    })
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .in("status", ["scheduled", "approved"])
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  const updatedCount = data?.length ?? 0;
  if (updatedCount === 0) {
    return { success: false, error: "Unable to unschedule this milestone." };
  }

  if (bundle.stepId && bundle.storyReminderSentAt) {
    await supabase
      .from("event_communication_steps")
      .update({ story_reminder_sent_at: null, updated_at: now })
      .eq("id", bundle.stepId);
  }

  revalidateMetaPaths(eventId);
  return { success: true, updatedCount, error: null };
}

export async function scheduleMetaBundleAction(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to schedule posts." };
  }

  await syncMetaPublicationSlots(eventId);
  const bundle = (await getMetaPublishBundles(eventId)).find(
    (entry) => entry.relativeDay === relativeDay,
  );

  if (!bundle) {
    return { success: false, error: "Milestone not found." };
  }

  if (!bundleIsSchedulable(bundle)) {
    return { success: false, error: "This milestone is not ready to schedule yet." };
  }

  if (bundleIsManualStoryOnly(bundle)) {
    return scheduleManualStoryOnlyBundle(eventId, relativeDay);
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
    await sendManualStoryPostKitIfNeeded(eventId, relativeDay, bundle);
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
  if (!(await hasPermission("publish_social"))) {
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
  if (!(await hasPermission("publish_social"))) {
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
  if (!(await hasPermission("publish_social"))) {
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
  if (!(await hasPermission("publish_social"))) {
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

export async function updatePublishModeAction(
  eventId: string,
  relativeDay: number,
  mode: MetaPublishMode,
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to update publish settings." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { metaPublishSurfaces, storyManualPublish } = publishModeToDb(mode);

  const { data: step, error: lookupError } = await supabase
    .from("event_communication_steps")
    .select("id, channel, status")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message };
  }

  if (!step?.id) {
    return { success: false, error: "Milestone not found." };
  }

  if (step.channel !== "facebook" && step.channel !== "instagram") {
    return {
      success: false,
      error: "Publish mode can only be set on Facebook or Instagram milestones.",
    };
  }

  const { error: updateError } = await supabase
    .from("event_communication_steps")
    .update({
      meta_publish_surfaces: metaPublishSurfaces,
      story_manual_publish: storyManualPublish,
      updated_at: now,
    })
    .eq("id", step.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await syncMetaPublicationSlots(eventId);
  revalidateMetaPaths(eventId);

  return { success: true, updatedCount: 1, error: null };
}

/** @deprecated Use updatePublishModeAction */
export async function updateMetaPublishSurfacesAction(
  eventId: string,
  relativeDay: number,
  surfaces: import("@/types/playbooks").MetaPublishSurfaces,
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to update publish settings." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: step, error: lookupError } = await supabase
    .from("event_communication_steps")
    .select("id, channel, status, story_manual_publish")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message };
  }

  if (!step?.id) {
    return { success: false, error: "Milestone not found." };
  }

  if (step.channel !== "facebook" && step.channel !== "instagram") {
    return {
      success: false,
      error: "Publish surfaces can only be set on Facebook or Instagram milestones.",
    };
  }

  const { error: updateError } = await supabase
    .from("event_communication_steps")
    .update({ meta_publish_surfaces: surfaces, updated_at: now })
    .eq("id", step.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await syncMetaPublicationSlots(eventId);
  revalidateMetaPaths(eventId);

  return { success: true, updatedCount: 1, error: null };
}

/** @deprecated Use updatePublishModeAction */
export async function updateStoryManualPublishAction(
  eventId: string,
  relativeDay: number,
  storyManualPublish: boolean,
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to update publish settings." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: step, error: lookupError } = await supabase
    .from("event_communication_steps")
    .select("id, channel, status, meta_publish_surfaces")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message };
  }

  if (!step?.id) {
    return { success: false, error: "Milestone not found." };
  }

  if (step.channel !== "facebook" && step.channel !== "instagram") {
    return {
      success: false,
      error: "Manual story posting can only be set on Facebook or Instagram milestones.",
    };
  }

  const { error: updateError } = await supabase
    .from("event_communication_steps")
    .update({ story_manual_publish: storyManualPublish, updated_at: now })
    .eq("id", step.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await syncMetaPublicationSlots(eventId);
  revalidateMetaPaths(eventId);

  return { success: true, updatedCount: 1, error: null };
}

export async function setMetaPublishPlatformEnabledAction(
  eventId: string,
  relativeDay: number,
  platform: "instagram" | "facebook",
  enabled: boolean,
): Promise<MetaPublishActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to update publish settings." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: slots, error: lookupError } = await supabase
    .from("meta_publication_slots")
    .select("id, status, platform")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .eq("platform", platform);

  if (lookupError) {
    return { success: false, error: lookupError.message };
  }

  if (!slots?.length && !enabled) {
    return { success: true, updatedCount: 0, error: null };
  }

  if (!enabled) {
    const blocked = slots?.some((slot) =>
      ["published", "posting"].includes(slot.status as string),
    );
    if (blocked) {
      return {
        success: false,
        error: "Cannot disable — this platform has already published or is posting.",
      };
    }

    const { data, error } = await supabase
      .from("meta_publication_slots")
      .update({ status: "cancelled", updated_at: now })
      .eq("event_id", eventId)
      .eq("relative_day", relativeDay)
      .eq("platform", platform)
      .in("status", ["draft", "scheduled", "approved", "failed"])
      .select("id");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateMetaPaths(eventId);
    return { success: true, updatedCount: data?.length ?? 0, error: null };
  }

  const { data: restored, error: restoreError } = await supabase
    .from("meta_publication_slots")
    .update({ status: "draft", updated_at: now })
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .eq("platform", platform)
    .eq("status", "cancelled")
    .select("id");

  if (restoreError) {
    return { success: false, error: restoreError.message };
  }

  if (!restored?.length) {
    await syncMetaPublicationSlots(eventId);
  }

  revalidateMetaPaths(eventId);
  return { success: true, updatedCount: restored?.length ?? 0, error: null };
}
