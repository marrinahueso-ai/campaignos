import "server-only";

import { saveCampaignBuilderSessionAction } from "@/lib/campaign-builder-v2/session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import {
  clearSessionGeneratedContent,
  isGeneratedPathForEvent,
  isGeneratedPathForMilestone,
  withStaleContentNote,
} from "@/lib/dev-tools/clear-generated-content";
import { writeDeveloperToolAudit } from "@/lib/dev-tools/audit";
import { getOrganizationSchoolYearIds } from "@/lib/events/org-scope";
import { createClient } from "@/lib/supabase/server";

export interface ClearGeneratedContentResult {
  success: boolean;
  message: string;
  artworkCleared: number;
  captionsCleared: number;
  clearedMilestoneIds: string[];
  /** Session snapshot for the client to merge when localStorage is richer. */
  sessionEventId: string;
}

async function assertEventBelongsToOrganization(
  eventId: string,
  organizationId: string,
): Promise<boolean> {
  const schoolYearIds = await getOrganizationSchoolYearIds(organizationId);
  if (schoolYearIds.length === 0) {
    return false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, school_year_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data?.school_year_id) {
    return false;
  }

  return schoolYearIds.includes(data.school_year_id as string);
}

async function clearScopedEventAssets(input: {
  eventId: string;
  milestoneIds: string[] | "all";
}): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_assets")
    .select("id, storage_path")
    .eq("event_id", input.eventId);

  if (error || !data?.length) {
    return 0;
  }

  const matched = data.filter((row) => {
    const path = row.storage_path as string | null;
    if (input.milestoneIds === "all") {
      return isGeneratedPathForEvent(path, input.eventId);
    }
    return input.milestoneIds.some((milestoneId) =>
      isGeneratedPathForMilestone(path, input.eventId, milestoneId),
    );
  });

  if (matched.length === 0) {
    return 0;
  }

  const ids = matched.map((row) => row.id as string);
  const now = new Date().toISOString();
  await supabase
    .from("event_assets")
    .update({
      storage_path: null,
      generation_prompt: null,
      ai_generated: false,
      updated_at: now,
    })
    .in("id", ids);

  // Detach Meta slot artwork refs only — do not unschedule.
  await supabase
    .from("meta_publication_slots")
    .update({ event_asset_id: null })
    .eq("event_id", input.eventId)
    .in("event_asset_id", ids);

  return matched.length;
}

async function markApprovalSnapshotsStale(input: {
  eventId: string;
  milestoneIds: string[] | "all";
}): Promise<void> {
  const supabase = await createClient();
  let query = supabase
    .from("approval_scheduling_items")
    .select("id, notes, campaign_milestone_id")
    .eq("event_id", input.eventId)
    .eq("source", "campaign_builder");

  if (input.milestoneIds !== "all") {
    query = query.in("campaign_milestone_id", input.milestoneIds);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    return;
  }

  const now = new Date().toISOString();
  for (const row of data) {
    if (input.milestoneIds !== "all" && !row.campaign_milestone_id) {
      continue;
    }
    await supabase
      .from("approval_scheduling_items")
      .update({
        feed_artwork_url: null,
        story_artwork_url: null,
        caption_text: null,
        story_caption: null,
        notes: withStaleContentNote(row.notes as string | null),
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("event_id", input.eventId);
  }
}

export async function clearGeneratedContentForScope(input: {
  organizationId: string;
  eventId: string;
  milestoneIds: string[] | "all";
  userId: string;
  actionType:
    | "clear_milestone_generated_content"
    | "clear_campaign_generated_content";
}): Promise<ClearGeneratedContentResult> {
  const eventOk = await assertEventBelongsToOrganization(
    input.eventId,
    input.organizationId,
  );
  if (!eventOk) {
    return {
      success: false,
      message: "Event not found in this organization.",
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  if (input.milestoneIds !== "all" && input.milestoneIds.length === 0) {
    return {
      success: false,
      message: "Select a milestone to clear.",
      artworkCleared: 0,
      captionsCleared: 0,
      clearedMilestoneIds: [],
      sessionEventId: input.eventId,
    };
  }

  const session = await loadCampaignBuilderSession(input.eventId);
  if (!session) {
    // Still clear approval snapshots / assets if session DB missing —
    // localStorage may be the only session. Return success with zero session
    // counts so the client can clear local state.
    await markApprovalSnapshotsStale({
      eventId: input.eventId,
      milestoneIds: input.milestoneIds,
    });
    const assetsCleared = await clearScopedEventAssets({
      eventId: input.eventId,
      milestoneIds: input.milestoneIds,
    });

    await writeDeveloperToolAudit({
      userId: input.userId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      campaignWorkspaceId: input.eventId,
      milestoneId:
        input.milestoneIds === "all"
          ? null
          : (input.milestoneIds[0] ?? null),
      actionType: input.actionType,
      artworkCleared: assetsCleared,
      captionsCleared: 0,
    });

    return {
      success: true,
      message:
        assetsCleared > 0
          ? `Cleared ${assetsCleared} scoped artwork asset reference(s). Refresh Create with AI to clear local preview.`
          : "No server session found. Local preview will be cleared in the browser.",
      artworkCleared: assetsCleared,
      captionsCleared: 0,
      clearedMilestoneIds:
        input.milestoneIds === "all" ? [] : input.milestoneIds,
      sessionEventId: input.eventId,
    };
  }

  if (input.milestoneIds !== "all") {
    for (const milestoneId of input.milestoneIds) {
      const exists = session.previewContents.some(
        (preview) => preview.milestoneId === milestoneId,
      );
      if (!exists) {
        return {
          success: false,
          message: "Milestone not found on this campaign (ID mismatch).",
          artworkCleared: 0,
          captionsCleared: 0,
          clearedMilestoneIds: [],
          sessionEventId: input.eventId,
        };
      }
    }
  }

  const cleared = clearSessionGeneratedContent(session, input.milestoneIds);
  await saveCampaignBuilderSessionAction(cleared.next);

  await markApprovalSnapshotsStale({
    eventId: input.eventId,
    milestoneIds: input.milestoneIds,
  });

  const assetRefsCleared = await clearScopedEventAssets({
    eventId: input.eventId,
    milestoneIds: input.milestoneIds,
  });

  // Count preview artwork URLs + scoped event_asset references cleared.
  // Do not modify events rows (including approved_square_image_url).
  const artworkCleared = cleared.artworkCleared + assetRefsCleared;

  await writeDeveloperToolAudit({
    userId: input.userId,
    organizationId: input.organizationId,
    eventId: input.eventId,
    campaignWorkspaceId: input.eventId,
    milestoneId:
      input.milestoneIds === "all" ? null : (input.milestoneIds[0] ?? null),
    actionType: input.actionType,
    artworkCleared,
    captionsCleared: cleared.captionsCleared,
  });

  return {
    success: true,
    message: `Cleared ${artworkCleared} artwork reference(s) and ${cleared.captionsCleared} caption(s).`,
    artworkCleared,
    captionsCleared: cleared.captionsCleared,
    clearedMilestoneIds: cleared.clearedMilestoneIds,
    sessionEventId: input.eventId,
  };
}
