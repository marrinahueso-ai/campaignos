import {
  buildArtworkPhaseItemsFromMilestones,
  filterMetaPublishTargetsBySurfaces,
  isApprovedArtworkAsset,
  META_PUBLISH_TARGETS,
} from "@/lib/artwork-v2/campaign-phases";
import {
  isStoryMilestoneDistinctlyApproved,
  resolveMilestonePhaseAsset,
} from "@/lib/artwork-v2/milestone-assets";
import { planDueDateToScheduledTime } from "@/lib/campaign-plan/plan-milestone-display";
import {
  findCommunicationStepForRelativeDay,
  resolveSocialMetaMilestonesForEvent,
} from "@/lib/campaign-plan/resolve-plan-milestones";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { buildCommunicationItemsByStepId, ensureStepCommunicationItemsForEvent } from "@/lib/event-workspace/communication-items";
import { getEventById } from "@/lib/events/queries";
import { mapMetaPublicationSlotRow } from "@/lib/meta-publishing/mappers";
import { isCommittedMetaSlotStatus } from "@/lib/meta-publishing/slot-status";
import { createJobClient } from "@/lib/supabase/job-client";
import { createClient } from "@/lib/supabase/server";
import { combineLocalDateAndTimeToIso } from "@/lib/utils/dates";
import type { MetaPublicationSlotRow } from "@/lib/meta-publishing/types";
import type { CommunicationItemRow } from "@/types/event-workspace";
import type { EventCommunicationStepRow, PlaybookStepInput } from "@/types/playbooks";
import type { MetaPublishSurfaces } from "@/types/playbooks";

function isMissingMetaSlotsTable(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42P01" || Boolean(error?.message?.includes("meta_publication_slots"));
}

function resolveStepPublishSurfaces(
  step: EventCommunicationStepRow | undefined,
): MetaPublishSurfaces {
  return (step?.meta_publish_surfaces as MetaPublishSurfaces | undefined) ?? "both";
}

function isStepStoryManualPublish(step: EventCommunicationStepRow | undefined): boolean {
  return Boolean(step?.story_manual_publish);
}

function isTargetEnabled(
  surfaces: MetaPublishSurfaces,
  storyManualPublish: boolean,
  platform: string,
  placement: string,
): boolean {
  return filterMetaPublishTargetsBySurfaces(surfaces, storyManualPublish).some(
    (target) => target.platform === platform && target.placement === placement,
  );
}

function defaultScheduledTime(dueDate: string | null): string | null {
  return planDueDateToScheduledTime(dueDate);
}

function resolveScheduledTimeFromStep(step: PlaybookStepInput): string | null {
  const dueDate = step.dueDate?.slice(0, 10);
  if (dueDate && step.scheduleTime) {
    return combineLocalDateAndTimeToIso(dueDate, step.scheduleTime);
  }

  if (dueDate) {
    return planDueDateToScheduledTime(dueDate);
  }

  return null;
}

/** Apply milestone planning schedule times to draft/upcoming meta publication slots. */
export async function applyMilestoneScheduleTimesFromSteps(
  eventId: string,
  steps: PlaybookStepInput[],
): Promise<void> {
  const scheduleByDay = new Map<number, string>();

  for (const step of steps) {
    if (step.channel !== "facebook" && step.channel !== "instagram") {
      continue;
    }

    const scheduledFor = resolveScheduledTimeFromStep(step);
    if (!scheduledFor) {
      continue;
    }

    scheduleByDay.set(step.relativeDay, scheduledFor);
  }

  if (scheduleByDay.size === 0) {
    return;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  for (const [relativeDay, scheduledFor] of scheduleByDay) {
    const { data: slots, error } = await supabase
      .from("meta_publication_slots")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("relative_day", relativeDay);

    if (error) {
      if (isMissingMetaSlotsTable(error)) {
        return;
      }
      console.error("Failed to load meta publication slots for schedule sync:", error.message);
      continue;
    }

    for (const slot of slots ?? []) {
      if (slot.status === "published" || slot.status === "cancelled") {
        continue;
      }

      if (["approved", "posting", "scheduled"].includes(slot.status as string)) {
        continue;
      }

      await supabase
        .from("meta_publication_slots")
        .update({ scheduled_for: scheduledFor, updated_at: now })
        .eq("id", slot.id);
    }
  }
}

export async function ensureMetaPublicationSlots(eventId: string): Promise<void> {
  await syncMetaPublicationSlots(eventId);
}

export async function syncMetaPublicationSlots(eventId: string): Promise<boolean> {
  const event = await getEventById(eventId);
  if (!event) {
    return false;
  }

  const milestones = await resolveSocialMetaMilestonesForEvent(eventId);

  if (milestones.length === 0) {
    const supabase = await createClient();
    const { data: existingSlots, error: listError } = await supabase
      .from("meta_publication_slots")
      .select("id, status")
      .eq("event_id", eventId);

    if (isMissingMetaSlotsTable(listError)) {
      return false;
    }

    for (const slot of existingSlots ?? []) {
      // Publish Now / custom CB2 dates create slots outside playbook days —
      // never wipe committed queue or history when the plan is empty.
      if (isCommittedMetaSlotStatus(slot.status as string)) {
        continue;
      }

      await supabase.from("meta_publication_slots").delete().eq("id", slot.id);
    }

    return true;
  }

  await ensureStepCommunicationItemsForEvent(eventId);

  const supabase = await createClient();
  const activeDays = new Set(milestones.map((milestone) => milestone.relativeDay));
  const [assets, stepsResult, itemsResult, existingSlotsResult] = await Promise.all([
    getCampaignAssetsForEvent(eventId),
    supabase
      .from("event_communication_steps")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("communication_items")
      .select("*")
      .eq("event_id", eventId)
      .not("event_communication_step_id", "is", null),
    supabase.from("meta_publication_slots").select("*").eq("event_id", eventId),
  ]);

  if (
    isMissingMetaSlotsTable(stepsResult.error) ||
    isMissingMetaSlotsTable(itemsResult.error) ||
    isMissingMetaSlotsTable(existingSlotsResult.error)
  ) {
    return false;
  }

  const steps = (stepsResult.data ?? []) as EventCommunicationStepRow[];
  const itemsByStepId = buildCommunicationItemsByStepId(
    (itemsResult.data ?? []) as CommunicationItemRow[],
  );
  const phaseItems = buildArtworkPhaseItemsFromMilestones(milestones);
  const now = new Date().toISOString();

  for (const slot of existingSlotsResult.data ?? []) {
    const row = slot as MetaPublicationSlotRow;
    if (activeDays.has(row.relative_day)) {
      continue;
    }

    // Custom publish dates (Publish Now / Schedule off playbook days) create
    // orphan relative_day rows. Keep anything already queued or posted.
    if (isCommittedMetaSlotStatus(row.status)) {
      continue;
    }

    await supabase.from("meta_publication_slots").delete().eq("id", row.id);
  }

  for (const milestone of milestones) {
    const step = findCommunicationStepForRelativeDay(steps, milestone.relativeDay, {
      preferMetaSocial: true,
    });
    const surfaces = resolveStepPublishSurfaces(step);
    const storyManualPublish = isStepStoryManualPublish(step);
    const communicationItemId = step
      ? (itemsByStepId.get(step.id as string)?.id ?? null)
      : null;

    const feedPhase = phaseItems.find(
      (phase) =>
        phase.relativeDay === milestone.relativeDay && phase.metaPlacement === "feed",
    );
    const storyPhase = phaseItems.find(
      (phase) =>
        phase.relativeDay === milestone.relativeDay && phase.metaPlacement === "story",
    );

    const titlesAtDay = steps
      .filter(
        (entry) =>
          entry.relative_day === milestone.relativeDay && entry.status !== "skipped",
      )
      .map((entry) => entry.title.trim())
      .filter(Boolean);
    const uniqueTitles = [...new Set(titlesAtDay)];

    const feedAsset = feedPhase
      ? resolveMilestonePhaseAsset(feedPhase, assets, uniqueTitles)
      : null;
    const storyAsset = storyPhase
      ? resolveMilestonePhaseAsset(storyPhase, assets, uniqueTitles)
      : null;

    const feedAssetId =
      feedAsset && isApprovedArtworkAsset(feedAsset) ? feedAsset.id : null;
    const storyAssetId =
      storyPhase && feedPhase
        ? isStoryMilestoneDistinctlyApproved(feedPhase, storyPhase, assets, uniqueTitles) &&
            storyAsset &&
            isApprovedArtworkAsset(storyAsset)
          ? storyAsset.id
          : null
        : storyAsset && isApprovedArtworkAsset(storyAsset)
          ? storyAsset.id
          : null;

    for (const target of META_PUBLISH_TARGETS) {
      const enabled = isTargetEnabled(surfaces, storyManualPublish, target.platform, target.placement);
      const eventAssetId = target.usesArtwork === "feed" ? feedAssetId : storyAssetId;

      const { data: existing, error: existingError } = await supabase
        .from("meta_publication_slots")
        .select("*")
        .eq("event_id", eventId)
        .eq("relative_day", milestone.relativeDay)
        .eq("platform", target.platform)
        .eq("placement", target.placement)
        .maybeSingle();

      if (isMissingMetaSlotsTable(existingError)) {
        return false;
      }

      if (!enabled) {
        if (!existing) {
          continue;
        }

        const row = existing as MetaPublicationSlotRow;
        if (row.status === "published" || row.status === "cancelled") {
          continue;
        }

        await supabase
          .from("meta_publication_slots")
          .update({ status: "cancelled", updated_at: now })
          .eq("id", row.id);
        continue;
      }

      const payload = {
        milestone_title: milestone.title,
        event_asset_id: eventAssetId,
        communication_item_id: communicationItemId,
        scheduled_for: defaultScheduledTime((step?.due_date as string | undefined) ?? null),
        updated_at: now,
      };

      if (existing) {
        const row = existing as MetaPublicationSlotRow;
        if (row.status === "published") {
          continue;
        }

        if (row.status === "cancelled") {
          await supabase
            .from("meta_publication_slots")
            .update({
              ...payload,
              status: "draft",
            })
            .eq("id", row.id);
          continue;
        }

        const preserveSchedule = isCommittedMetaSlotStatus(row.status);
        const updatePayload = preserveSchedule
          ? {
              milestone_title: payload.milestone_title,
              event_asset_id: payload.event_asset_id,
              communication_item_id: payload.communication_item_id,
              updated_at: payload.updated_at,
            }
          : payload;

        await supabase.from("meta_publication_slots").update(updatePayload).eq("id", row.id);
        continue;
      }

      const { error: insertError } = await supabase.from("meta_publication_slots").insert({
        event_id: eventId,
        relative_day: milestone.relativeDay,
        milestone_title: milestone.title,
        platform: target.platform,
        placement: target.placement,
        event_asset_id: eventAssetId,
        communication_item_id: communicationItemId,
        scheduled_for: defaultScheduledTime((step?.due_date as string | undefined) ?? null),
        status: "draft",
        updated_at: now,
      });

      if (isMissingMetaSlotsTable(insertError)) {
        return false;
      }
    }
  }

  return true;
}

export async function getMetaPublicationSlotsForEvent(
  eventId: string,
  options?: { useServiceRole?: boolean },
): Promise<import("@/lib/meta-publishing/types").MetaPublicationSlot[]> {
  const supabase = await createJobClient(Boolean(options?.useServiceRole));

  const { data, error } = await supabase
    .from("meta_publication_slots")
    .select("*")
    .eq("event_id", eventId)
    .order("relative_day", { ascending: true });

  if (error) {
    if (isMissingMetaSlotsTable(error)) {
      return [];
    }
    console.error("Failed to fetch meta publication slots:", error.message);
    return [];
  }

  return ((data ?? []) as MetaPublicationSlotRow[]).map(mapMetaPublicationSlotRow);
}
