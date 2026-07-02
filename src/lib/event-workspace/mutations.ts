import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { createClient } from "@/lib/supabase/server";
import {
  COMMUNICATION_CHANNELS,
  DEFAULT_BUDGET,
  DEFAULT_EVENT_CATEGORY,
  DEFAULT_EVENT_OWNER,
  EVENT_ASSET_TYPES,
  TIMELINE_STEPS,
} from "@/lib/event-workspace/constants";
import { draftCommunicationWithAi } from "@/lib/ai/draft";
import { assignPlaybookToEvent } from "@/lib/playbooks/mutations";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { shouldInitializeCampaignWorkspace } from "@/lib/events/communication-strategy";
import {
  buildEventAssetStoragePath,
  EVENT_ASSETS_BUCKET,
  getEventAssetPublicUrl,
} from "@/lib/event-workspace/storage";
import type { EventOverviewInput, EventDetailsInput, CommunicationChannel } from "@/types/event-workspace";
import type { Event } from "@/types";

function daysBefore(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysAfter(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function ensureEventAssets(eventId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("event_assets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (countError) {
    if (countError.code === "42P01") {
      return false;
    }
    console.error("Failed to check event assets:", countError.message);
    return false;
  }

  if ((count ?? 0) > 0) {
    return true;
  }

  const assetRows = EVENT_ASSET_TYPES.map(({ assetType }) => ({
    event_id: eventId,
    asset_type: assetType,
    status: "placeholder",
    ai_generated: false,
  }));

  const { error } = await supabase.from("event_assets").insert(assetRows);

  if (error) {
    console.error("Failed to ensure event assets:", error.message);
    return false;
  }

  return true;
}

export async function initializeEventWorkspace(event: Event): Promise<boolean> {
  const supabase = await createClient();

  if (!shouldInitializeCampaignWorkspace(event.communicationStrategy)) {
    return ensureEventAssets(event.id);
  }

  const { count } = await supabase
    .from("communication_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  if ((count ?? 0) > 0) {
    return true;
  }

  await supabase
    .from("events")
    .update({
      category: event.category ?? DEFAULT_EVENT_CATEGORY,
      event_owner: event.eventOwner ?? DEFAULT_EVENT_OWNER,
      budget: event.budget ?? DEFAULT_BUDGET,
      volunteer_needs: event.volunteerNeeds ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id);

  const assetsReady = await ensureEventAssets(event.id);
  if (!assetsReady) {
    return false;
  }

  const communicationRows = COMMUNICATION_CHANNELS.map(({ channel }) => ({
    event_id: event.id,
    channel,
    status: "draft",
    last_updated: new Date().toISOString(),
    is_published: false,
  }));

  const { data: insertedCommunications, error: communicationError } =
    await supabase.from("communication_items").insert(communicationRows).select("*");

  if (communicationError || !insertedCommunications) {
    console.error(
      "Failed to initialize communication items:",
      communicationError?.message,
    );
    return false;
  }

  const timelineRows = TIMELINE_STEPS.map((step, index) => ({
    event_id: event.id,
    activity_type: step.activityType,
    title: step.title,
    description: step.description,
    occurred_at:
      index === 0
        ? daysBefore(event.date, 21)
        : index === TIMELINE_STEPS.length - 1
          ? daysAfter(event.date, 1)
          : daysBefore(event.date, 18 - index * 3),
  }));

  const { error: timelineError } = await supabase
    .from("activity_log")
    .insert(timelineRows);

  if (timelineError) {
    console.error("Failed to initialize activity log:", timelineError.message);
    return false;
  }

  const generatedItem = insertedCommunications.find(
    (item) => item.channel === "website_announcement",
  );

  if (generatedItem) {
    await supabase.from("publication_schedule").insert({
      event_id: event.id,
      communication_item_id: generatedItem.id,
      scheduled_for: daysBefore(event.date, 7),
      status: "scheduled",
    });
  }

  const organization = await getLatestOrganization();
  await assignPlaybookToEvent(event, undefined, organization?.id ?? null);

  return true;
}

export async function updateEventDetails(
  eventId: string,
  input: EventDetailsInput,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      title: input.title.trim(),
      date: input.date,
      description: input.description,
      time: input.time || null,
      location: input.location || null,
      audience: input.audience || null,
      theme: input.theme || null,
      category: input.category || null,
      event_owner: input.eventOwner || null,
      budget: input.budget || null,
      volunteer_needs: input.volunteerNeeds?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("Failed to update event details:", error.message);
    return false;
  }

  return true;
}

export async function updateEventOverview(
  eventId: string,
  input: EventOverviewInput,
  identity: Pick<EventDetailsInput, "title" | "date" | "category">,
): Promise<boolean> {
  return updateEventDetails(eventId, {
    ...input,
    title: identity.title,
    date: identity.date,
    category: identity.category,
  });
}

export async function generateCommunicationContent(
  eventId: string,
  communicationItemId: string,
  channel: CommunicationChannel,
): Promise<boolean> {
  const result = await draftCommunicationWithAi({
    eventId,
    communicationItemId,
    channel,
  });

  return result.success;
}

/** @deprecated Use approval-workflow.ts via server actions instead. */
export async function approveCommunicationItem(
  communicationItemId: string,
  eventId: string,
): Promise<boolean> {
  const { approveCommunicationDraft } = await import(
    "@/lib/event-workspace/approval-workflow"
  );
  const { getCurrentCampaignRole } = await import("@/lib/auth/get-current-role");

  const role = await getCurrentCampaignRole();
  const result = await approveCommunicationDraft(eventId, communicationItemId, role);
  return result.success;
}

export async function markCommunicationPublished(
  communicationItemId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("communication_items")
    .update({
      status: "published",
      is_published: true,
      last_updated: now,
      updated_at: now,
    })
    .eq("id", communicationItemId);

  return !error;
}

export async function uploadEventAsset(
  eventId: string,
  assetId: string,
  file: File,
  uploadedBy: string | null = null,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: asset, error: assetError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (assetError || !asset || asset.event_id !== eventId) {
    console.error("Event asset not found for upload:", assetError?.message);
    return false;
  }

  const currentVersion = (asset.current_version as number | undefined) ?? 1;

  if (asset.status === "uploaded" && asset.storage_path) {
    const { error: versionError } = await supabase.from("event_asset_versions").insert({
      event_asset_id: assetId,
      version_number: currentVersion,
      filename: asset.filename,
      storage_path: asset.storage_path,
      uploaded_by: asset.uploaded_by,
      canva_url: asset.canva_url,
    });

    if (versionError && !isMissingSchemaError(versionError)) {
      console.error("Failed to archive asset version:", versionError.message);
      return false;
    }
  }

  const nextVersion = asset.status === "uploaded" ? currentVersion + 1 : currentVersion;
  const storagePath = buildEventAssetStoragePath(
    eventId,
    asset.asset_type,
    file.name,
    nextVersion,
  );
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(EVENT_ASSETS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload event asset:", uploadError.message);
    return false;
  }

  const publicUrl = getEventAssetPublicUrl(storagePath);

  const fullUpdate = {
    filename: file.name,
    storage_path: publicUrl,
    status: "uploaded" as const,
    uploaded_by: uploadedBy,
    current_version: nextVersion,
    updated_at: now,
  };

  let { error } = await supabase.from("event_assets").update(fullUpdate).eq("id", assetId);

  if (error && isMissingSchemaError(error)) {
    ({ error } = await supabase
      .from("event_assets")
      .update({
        filename: file.name,
        storage_path: publicUrl,
        status: "uploaded",
        updated_at: now,
      })
      .eq("id", assetId));
  }

  return !error;
}
