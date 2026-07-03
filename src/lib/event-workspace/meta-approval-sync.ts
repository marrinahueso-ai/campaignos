import { getEventById } from "@/lib/events/queries";
import { findCommunicationItemForStep } from "@/lib/event-workspace/communication-items";
import type { ApprovalActor } from "@/lib/event-workspace/approval-permissions";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  getFeedCaptionForMilestone,
  getMetaSocialCaptionsForEvent,
  isMilestoneCaptionsApproved,
} from "@/lib/meta-captions/queries";
import { getMetaPublishBundles } from "@/lib/meta-publishing/bundles";
import {
  cancelDuplicatePendingApprovalRequests,
  dedupePendingApprovalRequestsInDb,
} from "@/lib/event-workspace/approval-request-dedupe";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { createClient } from "@/lib/supabase/server";

const META_APPROVAL_BUNDLE_STATUSES = new Set([
  "ready",
  "scheduled",
]);

async function ensureCommunicationVersion(
  communicationItemId: string,
  content: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: existingVersion } = await supabase
    .from("communication_versions")
    .select("id, content")
    .eq("communication_item_id", communicationItemId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingVersion?.content?.trim() === content.trim()) {
    return existingVersion.id;
  }

  const { data: latest } = await supabase
    .from("communication_versions")
    .select("version_number")
    .eq("communication_item_id", communicationItemId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_number ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("communication_versions")
    .insert({
      communication_item_id: communicationItemId,
      content,
      version_number: nextVersion,
      created_by: "Meta social captions",
    })
    .select("id")
    .maybeSingle();

  if (error || !inserted?.id) {
    console.error("Failed to create communication version for meta milestone:", error?.message);
    return existingVersion?.id ?? null;
  }

  return inserted.id;
}

async function upsertPendingApprovalRequest(input: {
  eventId: string;
  communicationItemId: string;
  versionId: string | null;
  assignedOrganizationRoleId?: string | null;
  assignedUserId?: string | null;
  requestedByUserId?: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const assigneeFields = {
    assigned_organization_role_id: input.assignedOrganizationRoleId ?? null,
    assigned_user_id: input.assignedUserId ?? null,
    requested_by_user_id: input.requestedByUserId ?? null,
  };

  const { data: existing } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("communication_item_id", input.communicationItemId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "pending",
        communication_version_id: input.versionId,
        requested_at: now,
        resolved_at: null,
        notes: null,
        ...assigneeFields,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update approval request for meta milestone:", {
        communicationItemId: input.communicationItemId,
        error: error.message,
        code: error.code,
      });
      return false;
    }

    await cancelDuplicatePendingApprovalRequests(
      input.communicationItemId,
      existing.id,
    );
    return true;
  }

  const { data: inserted, error } = await supabase
    .from("approval_requests")
    .insert({
      event_id: input.eventId,
      communication_item_id: input.communicationItemId,
      communication_version_id: input.versionId,
      status: "pending",
      notes: null,
      ...assigneeFields,
    })
    .select("id")
    .maybeSingle();

  if (error || !inserted?.id) {
    console.error("Failed to create approval request for meta milestone:", {
      eventId: input.eventId,
      communicationItemId: input.communicationItemId,
      versionId: input.versionId,
      error: error?.message,
      code: error?.code,
    });
    return false;
  }

  await cancelDuplicatePendingApprovalRequests(
    input.communicationItemId,
    inserted.id,
  );
  return true;
}

export async function ensureMetaMilestoneApprovalRequest(
  eventId: string,
  relativeDay: number,
  actor?: ApprovalActor | null,
): Promise<boolean> {
  const [event, bundles, captions] = await Promise.all([
    getEventById(eventId),
    getMetaPublishBundles(eventId),
    getMetaSocialCaptionsForEvent(eventId),
  ]);

  if (!event) {
    return false;
  }

  const bundle = bundles.find((entry) => entry.relativeDay === relativeDay);
  if (!bundle?.isMetaPost || !META_APPROVAL_BUNDLE_STATUSES.has(bundle.status)) {
    return false;
  }

  if (!isMilestoneCaptionsApproved(captions, relativeDay)) {
    return false;
  }

  if (!bundle.stepId) {
    return false;
  }

  const communicationItemId = await findCommunicationItemForStep(bundle.stepId);
  if (!communicationItemId) {
    return false;
  }

  const captionContent = getFeedCaptionForMilestone(captions, relativeDay)?.trim();
  if (!captionContent) {
    return false;
  }

  const versionId = await ensureCommunicationVersion(communicationItemId, captionContent);
  const organization = await getCurrentOrganization();
  const assignee = organization
    ? await resolveApprovalAssignee(
        organization.id,
        event.approvalOrganizationRoleId ?? null,
      )
    : {
        organizationRoleId: null,
        assignedUserId: null,
      };

  const saved = await upsertPendingApprovalRequest({
    eventId,
    communicationItemId,
    versionId,
    assignedOrganizationRoleId: assignee.organizationRoleId,
    assignedUserId: assignee.assignedUserId,
    requestedByUserId: actor?.organizationUserId ?? null,
  });

  if (!saved) {
    return false;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("communication_items")
    .update({
      status: "pending_approval",
      last_updated: now,
      updated_at: now,
    })
    .eq("id", communicationItemId)
    .in("status", ["draft", "generated", "changes_requested"]);

  if (error) {
    console.error("Failed to mark meta milestone communication item pending approval:", error.message);
  }

  return true;
}

export async function syncMetaPublicationSlotsForApprovedItem(
  eventId: string,
  communicationItemId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("communication_items")
    .select("event_communication_step_id")
    .eq("id", communicationItemId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!item?.event_communication_step_id) {
    return;
  }

  const { data: step } = await supabase
    .from("event_communication_steps")
    .select("relative_day, channel")
    .eq("id", item.event_communication_step_id)
    .maybeSingle();

  if (!step || (step.channel !== "facebook" && step.channel !== "instagram")) {
    return;
  }

  const now = new Date().toISOString();
  await supabase
    .from("meta_publication_slots")
    .update({
      status: "approved",
      updated_at: now,
    })
    .eq("event_id", eventId)
    .eq("relative_day", step.relative_day)
    .in("status", ["scheduled"]);
}

export async function syncMetaApprovalRequestsForEvent(
  eventId: string,
  actor?: ApprovalActor | null,
): Promise<number> {
  const bundles = await getMetaPublishBundles(eventId);
  let synced = 0;

  for (const bundle of bundles) {
    if (!bundle.isMetaPost || !META_APPROVAL_BUNDLE_STATUSES.has(bundle.status)) {
      continue;
    }

    const created = await ensureMetaMilestoneApprovalRequest(
      eventId,
      bundle.relativeDay,
      actor,
    );

    if (created) {
      synced += 1;
    }
  }

  return synced;
}

export async function backfillMetaApprovalRequests(
  actor?: ApprovalActor | null,
): Promise<number> {
  const deduped = await dedupePendingApprovalRequestsInDb();
  if (deduped > 0) {
    console.info(`Cancelled ${deduped} duplicate pending approval request(s).`);
  }

  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("meta_publication_slots")
    .select("event_id")
    .in("status", ["draft", "scheduled"]);

  const eventIds = [...new Set((slots ?? []).map((slot) => slot.event_id as string))];

  const results = await Promise.all(
    eventIds.map((eventId) => syncMetaApprovalRequestsForEvent(eventId, actor)),
  );

  return results.reduce((total, count) => total + count, 0);
}
