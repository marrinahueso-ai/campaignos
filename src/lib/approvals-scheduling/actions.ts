"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import {
  sendChangeRequestedEmail,
  sendContentApprovedEmail,
  sendCampaignManualUploadEmail,
  sendScheduledDeliveryEmail,
} from "@/lib/campaign-builder-v2/approval-notifications";
import { isPublishNowDelivery } from "@/lib/campaign-builder-v2/delivery-method";
import {
  previewWantsMetaFeedSchedule,
  resolveFeedScheduleIso,
  scheduleMetaFeedFromCampaignBuilderApproval,
} from "@/lib/campaign-builder-v2/schedule-meta-from-approval";
import { saveCampaignBuilderSessionAction } from "@/lib/campaign-builder-v2/session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import {
  applySchedulingOutcomeToPreview,
  applySchedulingOutcomeToWorkflow,
  applySchedulingRowsToSession,
  type SchedulingSessionOutcome,
} from "@/lib/campaign-builder-v2/sync-session-from-scheduling";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import {
  approveCommunicationAction,
  requestCommunicationChangesAction,
} from "@/lib/event-workspace/actions";
import { logEventActivity } from "@/lib/event-workspace/activity-log";
import { publishMetaMilestoneBundle } from "@/lib/meta-publishing/publish-milestone";
import { retryFailedMetaBundleAction } from "@/lib/meta-publishing/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/dates";
import {
  deliveryMethodPatchAfterManualKitSend,
  resolveRowManualEmailSendAt,
  resolveRowMetaScheduleIntent,
} from "@/lib/approvals-scheduling/approval-visibility";
import { syncSchedulingItemsForMetaPublishOutcome } from "@/lib/approvals-scheduling/publish-outcome-sync";
import { sendPublishFailedEmail } from "@/lib/email/transactional-notifications";
import type {
  ApprovalSchedulingItemRow,
  UnifiedApprovalItem,
  UnifiedWorkflowStatus,
} from "@/lib/approvals-scheduling/types";
import { getUnifiedApprovalPreview } from "@/lib/approvals-scheduling/types";
import { milestoneNameMatchKey } from "@/lib/campaign-builder-v2/milestone-names";

export type UnifiedApprovalActionResult = {
  success: boolean;
  error?: string;
  /** Non-fatal notice (e.g. Meta schedule failed after approval already saved). */
  warning?: string;
};

async function syncCampaignBuilderSessionAfterSchedulingOutcome(input: {
  eventId: string;
  campaignMilestoneId: string | null;
  milestoneName: string;
  outcome: SchedulingSessionOutcome;
  changeRequestComment?: string | null;
}): Promise<void> {
  const session = await loadCampaignBuilderSession(input.eventId);
  if (!session) {
    return;
  }

  const workflowStatus =
    input.outcome === "approved"
      ? "scheduled"
      : input.outcome === "published"
        ? "published"
        : input.outcome;

  const synced = applySchedulingRowsToSession(session, [
    {
      campaignMilestoneId: input.campaignMilestoneId,
      milestoneName: input.milestoneName,
      workflowStatus,
      notes:
        input.outcome === "changes_requested"
          ? (input.changeRequestComment ?? null)
          : null,
    },
  ]);

  // Always stamp the matched milestone + workflow even if rows helper no-ops
  // (e.g. name/id mismatch edge cases after playbook rebuilds).
  const at = new Date().toISOString();
  const previewContents = synced.previewContents.map((preview) => {
    const matchesId =
      Boolean(input.campaignMilestoneId) &&
      preview.milestoneId === input.campaignMilestoneId;
    const milestone = session.milestones.find(
      (entry) => entry.id === preview.milestoneId,
    );
    const matchesName =
      Boolean(milestone) &&
      milestone!.name.trim().toLowerCase() ===
        input.milestoneName.trim().toLowerCase();
    if (!matchesId && !matchesName) {
      return preview;
    }
    return applySchedulingOutcomeToPreview(
      preview,
      input.outcome,
      at,
      input.outcome === "changes_requested"
        ? (input.changeRequestComment ?? null)
        : null,
    );
  });

  await saveCampaignBuilderSessionAction({
    ...synced,
    previewContents,
    approvalWorkflow: applySchedulingOutcomeToWorkflow(
      synced.approvalWorkflow,
      input.outcome,
    ),
  });
}

async function updateSchedulingItemStatus(
  schedulingItemId: string,
  workflowStatus: UnifiedWorkflowStatus,
  notes?: string | null,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("approval_scheduling_items")
    .update({
      workflow_status: workflowStatus,
      notes: notes ?? null,
      resolved_at:
        workflowStatus === "published" ||
        workflowStatus === "scheduled" ||
        workflowStatus === "failed" ||
        workflowStatus === "changes_requested"
          ? now
          : null,
      updated_at: now,
    })
    .eq("id", schedulingItemId);

  if (error?.code === "42P01") {
    return false;
  }

  return !error;
}

async function loadSchedulingItem(schedulingItemId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select("*")
    .eq("id", schedulingItemId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

function resolveManualEmailSendAt(row: ApprovalSchedulingItemRow): string | null {
  return resolveRowManualEmailSendAt(row);
}

async function resolveMetaScheduleIntent(row: ApprovalSchedulingItemRow): Promise<{
  wantsMetaFeedSchedule: boolean;
  storyManual: boolean;
  feedScheduleAt: string | null;
}> {
  const session = await loadCampaignBuilderSession(row.event_id);
  const preview =
    session?.previewContents.find(
      (entry) => entry.milestoneId === row.campaign_milestone_id,
    ) ?? null;

  if (preview) {
    return {
      wantsMetaFeedSchedule: previewWantsMetaFeedSchedule(preview),
      storyManual:
        preview.enabledFormats.includes("instagram-story-manual") ||
        Boolean(preview.manualEmailTo.trim()) ||
        preview.deliveryMethod === "manual-email",
      // Approvals row schedule is what the user sees — prefer it over session preview.
      feedScheduleAt: row.schedule_at ?? resolveFeedScheduleIso(preview),
    };
  }

  return resolveRowMetaScheduleIntent(row);
}

async function resolveUserEmailById(
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  return data?.email ?? null;
}

async function resolveSchedulingCreatorEmail(
  schedulingItemId: string,
): Promise<string | null> {
  const row = await loadSchedulingItem(schedulingItemId);
  return resolveUserEmailById(row?.requested_by_user_id);
}

/**
 * Meta Graph + Resend + Create with AI session sync after approval is already
 * persisted. Runs via after() so Ready to Ralli is not blocked on slow networks.
 * Failures are logged; Meta/email errors never reverse the saved approval.
 */
async function runApproveSchedulingSideEffects(input: {
  eventId: string;
  schedulingItemId: string;
  row: ApprovalSchedulingItemRow;
  campaignName?: string | null;
  milestoneName?: string | null;
  recipientEmail?: string | null;
}): Promise<void> {
  const { row, schedulingItemId, eventId } = input;
  let metaWarning: string | undefined;

  await syncCampaignBuilderSessionAfterSchedulingOutcome({
    eventId,
    campaignMilestoneId: row.campaign_milestone_id,
    milestoneName: row.milestone_name,
    outcome: "scheduled",
  });

  const creatorEmail =
    (await resolveUserEmailById(row.requested_by_user_id)) ??
    input.recipientEmail ??
    null;

  const manualRecipient =
    row.manual_email_to?.trim() || creatorEmail || null;
  const isManualUploadKit =
    row.delivery_method === "manual-email" ||
    Boolean(row.manual_email_to?.trim());

  const metaIntent = await resolveMetaScheduleIntent(row);
  const publishNow = isPublishNowDelivery(row.delivery_method);
  if (metaIntent.wantsMetaFeedSchedule) {
    const feedScheduleAt = publishNow
      ? new Date().toISOString()
      : metaIntent.feedScheduleAt;
    const metaResult = await scheduleMetaFeedFromCampaignBuilderApproval({
      eventId,
      milestoneName: row.milestone_name,
      campaignMilestoneId: row.campaign_milestone_id,
      feedArtworkUrl: row.feed_artwork_url,
      storyArtworkUrl: row.story_artwork_url,
      captionText: row.caption_text,
      storyCaption: row.story_caption,
      feedScheduleAt,
      wantsMetaFeedSchedule: true,
      storyManual: metaIntent.storyManual,
      immediatePublish: publishNow,
    });
    if (metaResult.error) {
      metaWarning = `Approved, but we couldn’t schedule your Facebook post: ${metaResult.error}`;
      console.error(
        "Meta feed schedule after CB2 approve failed:",
        metaResult.error,
      );
    } else if (publishNow && metaResult.relativeDay !== null) {
      const publishResult = await publishMetaMilestoneBundle({
        eventId,
        relativeDay: metaResult.relativeDay,
        immediate: true,
      });
      if (!publishResult.success) {
        metaWarning =
          publishResult.error?.trim() ||
          "Approved, but we couldn’t post to your Page. Open the Failed tab to try again.";
        console.error(
          "Immediate Meta publish after CB2 approve failed:",
          publishResult.error,
        );
        await updateSchedulingItemStatus(
          schedulingItemId,
          "failed",
          metaWarning,
        );
        await syncSchedulingItemsForMetaPublishOutcome({
          eventId,
          relativeDay: metaResult.relativeDay,
          milestoneTitle: row.milestone_name,
          outcome: "failed",
          errorMessage: metaWarning,
        });
        if (creatorEmail) {
          await sendPublishFailedEmail({
            toEmail: creatorEmail,
            contentName: `${row.milestone_name} in ${input.campaignName ?? "your campaign"}`,
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"}/approvals?event=${eventId}`,
            idempotencyKey: `publish-failed/${schedulingItemId}`,
          });
        }
      } else {
        const published = await updateSchedulingItemStatus(
          schedulingItemId,
          "published",
        );
        if (published) {
          await syncCampaignBuilderSessionAfterSchedulingOutcome({
            eventId,
            campaignMilestoneId: row.campaign_milestone_id,
            milestoneName: row.milestone_name,
            outcome: "published",
          });
        }
        await syncSchedulingItemsForMetaPublishOutcome({
          eventId,
          relativeDay: metaResult.relativeDay,
          milestoneTitle: row.milestone_name,
          outcome: "published",
        });
      }
    }
  }

  if (input.campaignName && input.milestoneName) {
    if (creatorEmail) {
      const approvedMail = await sendContentApprovedEmail({
        eventId,
        campaignName: input.campaignName,
        milestoneName: input.milestoneName,
        recipientEmail: creatorEmail,
        campaignMilestoneId: row.campaign_milestone_id,
        schedulingItemId,
        feedArtworkUrl: row.feed_artwork_url,
        storyArtworkUrl: row.story_artwork_url,
        captionText: row.caption_text,
        storyCaption: row.story_caption,
      });
      if (!approvedMail.success) {
        const emailWarning = `Approved, but we couldn’t email the creator: ${approvedMail.message}`;
        metaWarning = metaWarning
          ? `${metaWarning} ${emailWarning}`
          : emailWarning;
        console.error(
          "Content-approved email after approve failed:",
          approvedMail.message,
        );
      }
    }

    if (isManualUploadKit && manualRecipient) {
      const emailSendAt = resolveManualEmailSendAt(row);
      const scheduleAtMs = emailSendAt ? new Date(emailSendAt).getTime() : NaN;
      const dueNow =
        !emailSendAt ||
        Number.isNaN(scheduleAtMs) ||
        scheduleAtMs <= Date.now();
      // Resend allows scheduling up to 30 days ahead.
      const withinResendWindow =
        !dueNow &&
        scheduleAtMs - Date.now() <= 30 * 24 * 60 * 60 * 1000;

      if (dueNow || withinResendWindow) {
        const sendResult = await sendCampaignManualUploadEmail({
          eventId,
          campaignName: input.campaignName,
          milestoneName: input.milestoneName,
          recipientEmail: manualRecipient,
          scheduleLabel: emailSendAt
            ? formatDateTime(emailSendAt)
            : "Post kit",
          schedulingItemId,
          storyArtworkUrl: row.story_artwork_url,
          storyCaption: row.story_caption,
          feedCaption: row.caption_text,
          uploadLink: row.manual_upload_link,
          scheduledAt: dueNow ? null : emailSendAt,
        });

        if (sendResult.success) {
          const supabase = await createClient();
          await supabase
            .from("approval_scheduling_items")
            .update({
              // Keep schedule/auto-publish when Meta feed was also scheduled.
              ...deliveryMethodPatchAfterManualKitSend(
                metaIntent.wantsMetaFeedSchedule,
              ),
              manual_upload_email_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", schedulingItemId);
        } else {
          const emailWarning = `Approved, but we couldn’t email the post kit: ${sendResult.message}`;
          metaWarning = metaWarning
            ? `${metaWarning} ${emailWarning}`
            : emailWarning;
          console.error(
            "Manual upload email after approve failed:",
            sendResult.message,
          );
        }
      }
      // Beyond 30 days → daily cron /api/cron/manual-upload-emails
    } else if (creatorEmail && row.schedule_at) {
      const scheduledMail = await sendScheduledDeliveryEmail({
        eventId,
        campaignName: input.campaignName,
        milestoneName: input.milestoneName,
        recipientEmail: creatorEmail,
        scheduleLabel: formatDateTime(row.schedule_at),
        schedulingItemId,
        campaignMilestoneId: row.campaign_milestone_id,
        feedArtworkUrl: row.feed_artwork_url,
        storyArtworkUrl: row.story_artwork_url,
        captionText: row.caption_text,
        storyCaption: row.story_caption,
      });
      if (!scheduledMail.success) {
        const emailWarning = `Approved, but we couldn’t email the schedule notice: ${scheduledMail.message}`;
        metaWarning = metaWarning
          ? `${metaWarning} ${emailWarning}`
          : emailWarning;
        console.error(
          "Scheduled-delivery email after approve failed:",
          scheduledMail.message,
        );
      }
    }
  }

  if (metaWarning) {
    console.error("Approve side-effect warning (approval already saved):", metaWarning);
  }

  revalidatePath("/approvals");
  revalidatePath(`/events/${eventId}/campaign-builder`);
}

export async function approveUnifiedItemAction(input: {
  eventId: string;
  communicationItemId?: string | null;
  schedulingItemId?: string | null;
  campaignName?: string | null;
  milestoneName?: string | null;
  recipientEmail?: string | null;
}): Promise<UnifiedApprovalActionResult> {
  if (input.communicationItemId) {
    const result = await approveCommunicationAction(
      input.eventId,
      input.communicationItemId,
    );
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Couldn’t approve that. Try again.",
      };
    }
  }

  if (input.schedulingItemId) {
    const row = await loadSchedulingItem(input.schedulingItemId);
    if (!row) {
      return {
        success: false,
        error: "We couldn’t find this approval. Refresh and try again.",
      };
    }

    // Tenant guard: never approve a row from another event.
    if (row.event_id !== input.eventId) {
      return {
        success: false,
        error: "That approval doesn’t match this event.",
      };
    }

    if (
      !row.assigned_user_id &&
      !(await hasPermission("approve_comms")) &&
      (row.workflow_status === "in_queue" ||
        row.workflow_status === "assigned_to_me")
    ) {
      return {
        success: false,
        error: "Choose who approves this in Team Access first.",
      };
    }

    // Draft-only stays pre-publish (Draft), not Posted.
    const updated = await updateSchedulingItemStatus(
      input.schedulingItemId,
      "scheduled",
    );

    if (!updated) {
      return {
        success: false,
        error: "Couldn’t save that approval. Try again.",
      };
    }
    await logEventActivity({
      eventId: input.eventId,
      activityType: "board_approval",
      title: "Post approved",
      description: `${row.milestone_name} is approved and scheduled.`,
    });

    // Return as soon as approval_scheduling_items is saved. Meta Graph, Resend,
    // and Create with AI session sync can take seconds and must not block
    // Ready to Ralli.
    const sideEffectInput = {
      eventId: input.eventId,
      schedulingItemId: input.schedulingItemId,
      row: row as ApprovalSchedulingItemRow,
      campaignName: input.campaignName,
      milestoneName: input.milestoneName,
      recipientEmail: input.recipientEmail,
    };
    after(() =>
      runApproveSchedulingSideEffects(sideEffectInput).catch((error) => {
        console.error("Approve scheduling side effects failed:", error);
      }),
    );
  }

  revalidatePath("/approvals");
  return { success: true };
}

export async function requestUnifiedChangesAction(input: {
  eventId: string;
  communicationItemId?: string | null;
  schedulingItemId?: string | null;
  comment: string;
  /** Optional Revision tags — become the creator checklist. */
  tags?: string[] | null;
  creatorEmail?: string | null;
  campaignName?: string | null;
  milestoneName?: string | null;
}): Promise<UnifiedApprovalActionResult> {
  const comment = input.comment.trim();
  if (!comment) {
    return {
      success: false,
      error: "Add a short note so your teammate knows what to fix.",
    };
  }

  const { encodeRevisionNotes } = await import(
    "@/lib/approvals-revision/revision-notes"
  );
  type Tag = import("@/components/approvals-revision/types").RevisionTag;
  const tags = (input.tags ?? []).filter(Boolean) as Tag[];
  const storedNotes = encodeRevisionNotes(comment, tags);

  const { getCurrentOrganization } = await import("@/lib/auth/organization-context");
  const organization = await getCurrentOrganization();
  if (organization) {
    const { assertOrgFeature } = await import("@/lib/billing/gates");
    const featureGate = await assertOrgFeature(organization.id, "change_requests");
    if (!featureGate.ok) {
      return {
        success: false,
        error: `${featureGate.message} ${featureGate.upgradeHint}`,
      };
    }
  }

  if (input.communicationItemId) {
    const result = await requestCommunicationChangesAction(
      input.eventId,
      input.communicationItemId,
      comment,
    );
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Couldn’t send those changes. Try again.",
      };
    }
  }

  let schedulingRow: ApprovalSchedulingItemRow | null = null;
  if (input.schedulingItemId) {
    schedulingRow = (await loadSchedulingItem(
      input.schedulingItemId,
    )) as ApprovalSchedulingItemRow | null;
    const updated = await updateSchedulingItemStatus(
      input.schedulingItemId,
      "changes_requested",
      storedNotes,
    );
    if (!updated) {
      return {
        success: false,
        error: "Couldn’t save those changes. Try again.",
      };
    }

    if (schedulingRow) {
      await syncCampaignBuilderSessionAfterSchedulingOutcome({
        eventId: input.eventId,
        campaignMilestoneId: schedulingRow.campaign_milestone_id,
        milestoneName: schedulingRow.milestone_name,
        outcome: "changes_requested",
        changeRequestComment: comment,
      });
      await logEventActivity({
        eventId: input.eventId,
        activityType: "board_approval",
        title: "Changes requested",
        description: `Changes requested for ${schedulingRow.milestone_name}.`,
      });
    }
  }

  const creatorEmail =
    input.creatorEmail ??
    (input.schedulingItemId
      ? await resolveSchedulingCreatorEmail(input.schedulingItemId)
      : null);

  if (creatorEmail && input.campaignName && input.milestoneName) {
    await sendChangeRequestedEmail({
      eventId: input.eventId,
      campaignName: input.campaignName,
      milestoneName: input.milestoneName,
      recipientEmail: creatorEmail,
      comment,
      campaignMilestoneId: schedulingRow?.campaign_milestone_id ?? null,
      schedulingItemId: input.schedulingItemId ?? null,
      feedArtworkUrl: schedulingRow?.feed_artwork_url,
      storyArtworkUrl: schedulingRow?.story_artwork_url,
      captionText: schedulingRow?.caption_text,
      storyCaption: schedulingRow?.story_caption,
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/approvals/revision");
  revalidatePath(`/events/${input.eventId}/campaign-builder`);
  return { success: true };
}

/**
 * Creator resubmit from Revision workspace after changes_requested.
 * Returns the item to the approver queue and emails them.
 */
export async function resubmitUnifiedApprovalAction(input: {
  eventId: string;
  schedulingItemId: string;
  campaignName: string;
  milestoneName: string;
  feedArtworkUrl?: string | null;
  storyArtworkUrl?: string | null;
  captionText?: string | null;
  storyCaption?: string | null;
  scheduleAt?: string | null;
}): Promise<UnifiedApprovalActionResult> {
  const schedulingRow = (await loadSchedulingItem(
    input.schedulingItemId,
  )) as ApprovalSchedulingItemRow | null;

  if (!schedulingRow) {
    return { success: false, error: "Couldn’t find that approval item." };
  }

  if (schedulingRow.event_id !== input.eventId) {
    return { success: false, error: "That approval doesn’t match this event." };
  }

  if (schedulingRow.workflow_status !== "changes_requested") {
    return {
      success: false,
      error: "This item isn’t waiting on edits anymore.",
    };
  }

  const {
    mergeRevisionResubmitFields,
    patchPreviewFromRevision,
    snapshotFromSchedulingRow,
  } = await import("@/lib/approvals-revision/sync-revision-snapshot");

  const mergedSnapshot = mergeRevisionResubmitFields(
    snapshotFromSchedulingRow(schedulingRow),
    {
      feedArtworkUrl: input.feedArtworkUrl,
      storyArtworkUrl: input.storyArtworkUrl,
      captionText: input.captionText,
      storyCaption: input.storyCaption,
      scheduleAt: input.scheduleAt,
    },
  );

  const workflowStatus: UnifiedWorkflowStatus = schedulingRow.assigned_user_id
    ? "assigned_to_me"
    : "in_queue";
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { error } = await supabase
    .from("approval_scheduling_items")
    .update({
      workflow_status: workflowStatus,
      notes: null,
      resolved_at: null,
      requested_at: now,
      updated_at: now,
      feed_artwork_url: mergedSnapshot.feedArtworkUrl,
      story_artwork_url: mergedSnapshot.storyArtworkUrl,
      caption_text: mergedSnapshot.captionText,
      story_caption: mergedSnapshot.storyCaption,
      schedule_at: mergedSnapshot.scheduleAt,
    })
    .eq("id", input.schedulingItemId);

  if (error) {
    return {
      success: false,
      error: "Couldn’t send for re-approval. Try again.",
    };
  }

  // Merge revision edits into Create with AI session, then stamp awaiting approval.
  const session = await loadCampaignBuilderSession(input.eventId);
  if (session && schedulingRow.campaign_milestone_id) {
    const { previewAfterResendForApproval } = await import(
      "@/lib/campaign-builder-v2/milestone-status"
    );
    const previewContents = session.previewContents.map((preview) => {
      if (preview.milestoneId !== schedulingRow.campaign_milestone_id) {
        return preview;
      }
      const patched = patchPreviewFromRevision({
        preview,
        snapshot: mergedSnapshot,
      });
      return {
        ...patched,
        ...previewAfterResendForApproval(patched, now),
      };
    });
    await saveCampaignBuilderSessionAction({
      ...session,
      previewContents,
    });
  }

  const { getCurrentOrganization } = await import(
    "@/lib/auth/organization-context"
  );
  const organization = await getCurrentOrganization();
  let recipientEmail: string | null = null;
  if (organization) {
    const users = await getOrganizationUsers(organization.id);
    if (schedulingRow.assigned_user_id) {
      recipientEmail =
        users.find((u) => u.id === schedulingRow.assigned_user_id)?.email ??
        null;
    }
    if (!recipientEmail && schedulingRow.assigned_organization_role_id) {
      recipientEmail =
        users.find(
          (u) =>
            u.status === "active" &&
            u.organizationRoleId ===
              schedulingRow.assigned_organization_role_id,
        )?.email ?? null;
    }
  }

  if (recipientEmail) {
    const { sendApprovalResubmittedEmail } = await import(
      "@/lib/campaign-builder-v2/approval-notifications"
    );
    await sendApprovalResubmittedEmail({
      eventId: input.eventId,
      campaignName: input.campaignName,
      milestoneName: input.milestoneName,
      recipientEmail,
      schedulingItemId: input.schedulingItemId,
      campaignMilestoneId: schedulingRow?.campaign_milestone_id ?? null,
      feedArtworkUrl: mergedSnapshot.feedArtworkUrl,
      storyArtworkUrl: mergedSnapshot.storyArtworkUrl,
      captionText: mergedSnapshot.captionText,
      storyCaption: mergedSnapshot.storyCaption,
    });
  }
  const { isFlyerComposerMilestoneId } = await import(
    "@/lib/flyer-composer/approval"
  );
  const isFlyerResubmit = isFlyerComposerMilestoneId(
    schedulingRow?.campaign_milestone_id,
  );
  await logEventActivity({
    eventId: input.eventId,
    activityType: "board_approval",
    title: isFlyerResubmit
      ? "Flyer sent for re-approval"
      : "Post sent for re-approval",
    description: `${input.milestoneName} is back in the approval queue.`,
  });

  revalidatePath("/approvals");
  revalidatePath("/approvals/revision");
  revalidatePath(`/events/${input.eventId}/campaign-builder`);
  return { success: true };
}

export async function reassignUnifiedItemAction(input: {
  schedulingItemId: string;
  assignedUserId: string;
}): Promise<UnifiedApprovalActionResult> {
  // Intentional: maps the former admin/president/vp_communications gate.
  // manage_people would drop VP Communications, who historically could reassign.
  if (!(await hasPermission("approve_comms"))) {
    return {
      success: false,
      error: "Only organization admins can reassign approvals.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("approval_scheduling_items")
    .update({
      assigned_user_id: input.assignedUserId,
      workflow_status: "assigned_to_me",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.schedulingItemId);

  if (error) {
    return {
      success: false,
      error: "Couldn’t reassign that. Try again.",
    };
  }

  revalidatePath("/approvals");
  return { success: true };
}

export async function getReassignableUsersAction(): Promise<
  Array<{ id: string; email: string; roleName: string | null }>
> {
  const { getCurrentOrganization } = await import("@/lib/auth/organization-context");
  const organization = await getCurrentOrganization();
  if (!organization) {
    return [];
  }

  const users = await getOrganizationUsers(organization.id);
  return users
    .filter((user) => user.status === "active")
    .map((user) => ({
      id: user.id,
      email: user.email,
      roleName: user.organizationRoleName,
    }));
}

async function resolveMetaRelativeDayForApproval(input: {
  eventId: string;
  milestoneName: string;
  communicationItemId: string | null;
  metaRelativeDay: number | null;
}): Promise<number | null> {
  if (typeof input.metaRelativeDay === "number") {
    return input.metaRelativeDay;
  }

  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("meta_publication_slots")
    .select("relative_day, milestone_title, communication_item_id, status")
    .eq("event_id", input.eventId)
    .in("status", ["failed", "approved", "scheduled", "draft", "posting"]);

  if (!slots?.length) {
    return null;
  }

  const targetKey = milestoneNameMatchKey(input.milestoneName);
  const match =
    slots.find(
      (slot) =>
        input.communicationItemId &&
        slot.communication_item_id === input.communicationItemId,
    ) ??
    slots.find(
      (slot) =>
        milestoneNameMatchKey(String(slot.milestone_title ?? "")) === targetKey,
    );

  return typeof match?.relative_day === "number" ? match.relative_day : null;
}

/** Retry a failed Meta publish from Approvals (Posted / Failed outcomes). */
export async function retryFailedUnifiedApprovalAction(input: {
  eventId: string;
  schedulingItemId: string | null;
  milestoneName: string;
  campaignMilestoneId: string | null;
  communicationItemId: string | null;
  metaRelativeDay: number | null;
}): Promise<UnifiedApprovalActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return {
      success: false,
      error: "You don’t have permission to post to your Page.",
    };
  }

  const relativeDay = await resolveMetaRelativeDayForApproval({
    eventId: input.eventId,
    milestoneName: input.milestoneName,
    communicationItemId: input.communicationItemId,
    metaRelativeDay: input.metaRelativeDay,
  });

  if (relativeDay === null) {
    return {
      success: false,
      error: "We couldn’t find this post to retry. Open the campaign and try Publish again.",
    };
  }

  const result = await retryFailedMetaBundleAction(input.eventId, relativeDay);

  if (!result.success) {
    const message =
      result.error?.trim() || "Couldn’t post to your Page. Try again.";
    if (input.schedulingItemId) {
      await updateSchedulingItemStatus(input.schedulingItemId, "failed", message);
    }
    await syncSchedulingItemsForMetaPublishOutcome({
      eventId: input.eventId,
      relativeDay,
      milestoneTitle: input.milestoneName,
      outcome: "failed",
      errorMessage: message,
    });
    return { success: false, error: message };
  }

  if (input.schedulingItemId) {
    await updateSchedulingItemStatus(input.schedulingItemId, "published");
    await syncCampaignBuilderSessionAfterSchedulingOutcome({
      eventId: input.eventId,
      campaignMilestoneId: input.campaignMilestoneId,
      milestoneName: input.milestoneName,
      outcome: "published",
    });
  }
  await syncSchedulingItemsForMetaPublishOutcome({
    eventId: input.eventId,
    relativeDay,
    milestoneTitle: input.milestoneName,
    outcome: "published",
  });

  revalidatePath("/approvals");
  revalidatePath(`/events/${input.eventId}`);
  return { success: true };
}

/**
 * Load rich preview fields for the opened Approvals hub item.
 * Hub list uses lean columns; captions load here on demand.
 */
export async function enrichUnifiedApprovalItemPreviewAction(
  item: UnifiedApprovalItem,
): Promise<UnifiedApprovalItem> {
  item = { ...item, preview: getUnifiedApprovalPreview(item) };

  if (item.schedulingItemId) {
    const { fetchSchedulingItemPreviewFields } = await import(
      "@/lib/approvals-scheduling/queries"
    );
    const preview = await fetchSchedulingItemPreviewFields(item.schedulingItemId);
    if (!preview) {
      return item;
    }
    return {
      ...item,
      thumbnailUrl:
        preview.feedArtworkUrl ??
        preview.storyArtworkUrl ??
        item.thumbnailUrl,
      preview: {
        captionText: preview.captionText ?? item.preview.captionText,
        storyCaptionSnippet:
          preview.storyCaptionSnippet ?? item.preview.storyCaptionSnippet,
        feedArtworkUrl: preview.feedArtworkUrl ?? item.preview.feedArtworkUrl,
        storyArtworkUrl:
          preview.storyArtworkUrl ?? item.preview.storyArtworkUrl,
      },
    };
  }

  if (item.source === "classic" && item.approvalRequestId) {
    const { getApprovalQueueOverviewForCurrentUser } = await import(
      "@/lib/event-workspace/approval-routing-queries"
    );
    const { mapClassicApprovalItem } = await import(
      "@/lib/approvals-scheduling/map-items"
    );
    const { getTodayDateString } = await import("@/lib/utils/dates");

    const overview = await getApprovalQueueOverviewForCurrentUser(item.eventId, {
      enrichPreviews: true,
    });
    const candidates = [
      ...overview.assignedToMe,
      ...overview.allPending,
      ...overview.changesRequested,
      ...overview.recentlyApproved,
    ];
    const match = candidates.find((entry) => entry.id === item.approvalRequestId);
    if (!match) {
      return item;
    }
    const mapped = mapClassicApprovalItem(match, getTodayDateString());
    return {
      ...item,
      milestoneName: mapped.milestoneName || item.milestoneName,
      thumbnailUrl: mapped.thumbnailUrl ?? item.thumbnailUrl,
      preview: mapped.preview,
    };
  }

  return item;
}
