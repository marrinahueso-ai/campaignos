import { createClient } from "@/lib/supabase/server";
import { draftCommunicationWithAi } from "@/lib/ai/draft";
import type { DraftPerformanceTracker } from "@/lib/ai/draft-performance";
import {
  appendEditingMemoryRecord,
  getLatestAiDraftForItem,
} from "@/lib/brand-voice";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { isPersistableStepId } from "@/lib/communications-brain/generator";
import {
  ensureCommunicationItemForStep,
  ensureStepCommunicationItemsForEvent,
} from "@/lib/event-workspace/communication-items";
import { getEventPlaybookData } from "@/lib/playbooks/queries";
import type { CommunicationChannel } from "@/types/event-workspace";

export async function generateDraftForStep(
  eventId: string,
  stepId: string,
  performance?: DraftPerformanceTracker,
): Promise<{ success: boolean; error: string | null }> {
  if (!isPersistableStepId(stepId)) {
    return {
      success: false,
      error: "Assign a live playbook to generate storable drafts.",
    };
  }

  const playbookData = await getEventPlaybookData(eventId);
  const step = playbookData?.steps.find((entry) => entry.id === stepId);

  if (!step) {
    return {
      success: false,
      error: "Timeline step not found for this event.",
    };
  }

  const itemId = await ensureCommunicationItemForStep(
    eventId,
    stepId,
    step.channel,
  );

  if (!itemId) {
    return {
      success: false,
      error: "Unable to prepare this timeline communication.",
    };
  }

  console.info("✓ Timeline draft request", {
    eventId,
    stepId,
    channel: step.channel,
    communicationItemId: itemId,
  });

  const result = await draftCommunicationWithAi({
    eventId,
    communicationItemId: itemId,
    channel: step.channel,
    stepId,
    performance,
  });

  if (result.success) {
    const supabase = await createClient();
    const insertActivity = () =>
      supabase.from("activity_log").insert({
        event_id: eventId,
        activity_type: "communications_generated",
        title: "Communication draft generated",
        description: "AI draft created for timeline step.",
        occurred_at: new Date().toISOString(),
      });

    if (performance) {
      await performance.time("activityLog", async () => insertActivity());
    } else {
      await insertActivity();
    }
  }

  return {
    success: result.success,
    error: result.error,
  };
}

export async function generateAllDraftsForEvent(eventId: string): Promise<{
  generated: number;
  skipped: number;
  failed: number;
}> {
  const playbookData = await getEventPlaybookData(eventId);
  if (!playbookData?.steps.length) {
    return { generated: 0, skipped: 0, failed: 0 };
  }

  await ensureStepCommunicationItemsForEvent(eventId);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const step of playbookData.steps) {
    if (!isPersistableStepId(step.id)) {
      skipped += 1;
      continue;
    }

    const itemId = await ensureCommunicationItemForStep(
      eventId,
      step.id,
      step.channel,
    );

    if (!itemId) {
      failed += 1;
      continue;
    }

    const result = await draftCommunicationWithAi({
      eventId,
      communicationItemId: itemId,
      channel: step.channel,
      stepId: step.id,
    });

    if (result.success) {
      generated += 1;
    } else {
      failed += 1;
    }
  }

  return { generated, skipped, failed };
}

export async function updateStepDraftContent(
  communicationItemId: string,
  eventId: string,
  content: string,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const aiDraft = await getLatestAiDraftForItem(communicationItemId);

  const { data: versions } = await supabase
    .from("communication_versions")
    .select("version_number")
    .eq("communication_item_id", communicationItemId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

  const { error: versionError } = await supabase.from("communication_versions").insert({
    communication_item_id: communicationItemId,
    content,
    version_number: nextVersion,
    created_by: "Volunteer edit",
  });

  if (versionError) {
    return false;
  }

  const { error: itemError } = await supabase
    .from("communication_items")
    .update({
      status: "generated",
      last_updated: now,
      updated_at: now,
    })
    .eq("id", communicationItemId);

  if (itemError) {
    return false;
  }

  const organization = await getLatestOrganization();
  if (organization && aiDraft && aiDraft.trim() !== content.trim()) {
    const { data: item } = await supabase
      .from("communication_items")
      .select("channel")
      .eq("id", communicationItemId)
      .maybeSingle();

    if (item?.channel) {
      await appendEditingMemoryRecord({
        organizationId: organization.id,
        eventId,
        communicationItemId,
        channel: item.channel as CommunicationChannel,
        aiDraft,
        approvedEdit: content,
      });
    }
  }

  await supabase.from("activity_log").insert({
    event_id: eventId,
    activity_type: "communications_generated",
    title: "Communication draft edited",
    description: "Volunteer saved edits to a timeline draft.",
    occurred_at: now,
  });

  return true;
}
