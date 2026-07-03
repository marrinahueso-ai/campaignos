import "server-only";

import {
  buildArtworkPhaseItemsFromMilestones,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { mapEventAssetRows } from "@/lib/event-workspace/mappers";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { mapEventRow } from "@/lib/events/mappers";
import {
  getFeedCaptionForMilestone,
  getMetaSocialCaptionsForEvent,
  getStoryCaptionForMilestone,
} from "@/lib/meta-captions/queries";
import { buildStoryReminderEmail } from "@/lib/meta-publishing/story-reminder-email";
import { resolveEventShareLink } from "@/lib/meta-publishing/post-kit";
import { isManualStoryEmailMode, derivePublishMode } from "@/lib/meta-publishing/publish-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/types";
import type { EventAssetRow } from "@/types/event-workspace";
import type { MetaPublishSurfaces } from "@/types/playbooks";

export interface SendStoryPostKitResult {
  success: boolean;
  error?: string | null;
  skipped?: boolean;
  recipients?: number;
}

function resolveSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://campaignos-six.vercel.app"
  );
}

function formatScheduledLabel(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function defaultScheduledTime(dueDate: string | null): Date | null {
  if (!dueDate) {
    return null;
  }

  const dateOnly = dueDate.slice(0, 10);
  return new Date(`${dateOnly}T10:00:00.000Z`);
}

async function resolveStoryArtworkUrl(
  eventId: string,
  relativeDay: number,
  milestoneTitle: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data: assetsData, error } = await supabase
    .from("event_assets")
    .select("*")
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false });

  if (error) {
    return null;
  }

  const assets = mapEventAssetRows((assetsData ?? []) as EventAssetRow[]);
  const phaseItems = buildArtworkPhaseItemsFromMilestones([
    { relativeDay, title: milestoneTitle },
  ]);
  const storyPhase = phaseItems.find((phase) => phase.metaPlacement === "story");
  if (!storyPhase) {
    return null;
  }

  const storyAsset = resolveWorkflowAsset(storyPhase, null, assets);
  if (!storyAsset || !isApprovedArtworkAsset(storyAsset) || !storyAsset.storagePath) {
    return null;
  }

  return resolveAssetImageUrl(storyAsset.storagePath);
}

async function getStoryReminderRecipients(
  organizationId: string,
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("email, campaign_role")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("campaign_role", ["admin", "vp_communications"]);

  if (error) {
    console.error("Failed to load story reminder recipients:", error.message);
    return [];
  }

  const emails = new Set<string>();
  for (const row of data ?? []) {
    const email = (row.email as string | undefined)?.trim();
    if (email) {
      emails.add(email);
    }
  }

  return [...emails];
}

async function resolveScheduledFor(
  eventId: string,
  relativeDay: number,
  dueDate: string | null,
): Promise<Date | null> {
  const supabase = await createClient();
  const { data: slot } = await supabase
    .from("meta_publication_slots")
    .select("scheduled_for")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .not("scheduled_for", "is", null)
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (slot?.scheduled_for) {
    return new Date(slot.scheduled_for as string);
  }

  return defaultScheduledTime(dueDate);
}

async function markReminderSent(stepId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("event_communication_steps")
    .update({ story_reminder_sent_at: now, updated_at: now })
    .eq("id", stepId);
}

/** Send story post kit email for one milestone. Used after schedule/publish and by cron backup. */
export async function sendStoryPostKitForMilestone(input: {
  eventId: string;
  relativeDay: number;
  /** When false, skip if story_reminder_sent_at is already set. */
  forceResend?: boolean;
}): Promise<SendStoryPostKitResult> {
  if (!isEmailConfigured()) {
    return { success: false, error: "Email is not configured (RESEND_API_KEY missing)." };
  }

  const supabase = await createClient();
  const { data: step, error: stepError } = await supabase
    .from("event_communication_steps")
    .select(
      "id, title, due_date, meta_publish_surfaces, story_manual_publish, story_reminder_sent_at, channel",
    )
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .maybeSingle();

  if (stepError) {
    return { success: false, error: stepError.message };
  }

  if (!step?.id) {
    return { success: false, error: "Milestone not found." };
  }

  const surfaces = (step.meta_publish_surfaces as MetaPublishSurfaces | undefined) ?? "both";
  const storyManualPublish = Boolean(step.story_manual_publish);
  const mode = derivePublishMode(surfaces, storyManualPublish);

  if (!isManualStoryEmailMode(mode)) {
    return { success: true, skipped: true };
  }

  if (!input.forceResend && step.story_reminder_sent_at) {
    return { success: true, skipped: true };
  }

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("id, title, date, planning_quick_links, school_year_id")
    .eq("id", input.eventId)
    .maybeSingle();

  if (eventError || !eventRow) {
    return { success: false, error: eventError?.message ?? "Event not found." };
  }

  const schoolYearId = eventRow.school_year_id as string | null;
  if (!schoolYearId) {
    return { success: false, error: "Event has no organization context." };
  }

  const { data: schoolYear, error: schoolYearError } = await supabase
    .from("school_years")
    .select("organization_id")
    .eq("id", schoolYearId)
    .maybeSingle();

  if (schoolYearError || !schoolYear?.organization_id) {
    return {
      success: false,
      error: schoolYearError?.message ?? "Organization not found.",
    };
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, timezone")
    .eq("id", schoolYear.organization_id)
    .maybeSingle();

  if (orgError || !organization) {
    return { success: false, error: orgError?.message ?? "Organization not found." };
  }

  const recipients = await getStoryReminderRecipients(organization.id as string);
  if (recipients.length === 0) {
    return {
      success: false,
      error: "No admin or VP Communications recipients configured.",
    };
  }

  const captions = await getMetaSocialCaptionsForEvent(input.eventId);
  const feedCaption = getFeedCaptionForMilestone(captions, input.relativeDay);
  const storyCaption = getStoryCaptionForMilestone(captions, input.relativeDay);
  const storyArtworkUrl = await resolveStoryArtworkUrl(
    input.eventId,
    input.relativeDay,
    step.title as string,
  );

  const scheduledFor =
    (await resolveScheduledFor(
      input.eventId,
      input.relativeDay,
      step.due_date as string | null,
    )) ?? new Date();

  const event = mapEventRow({
    id: eventRow.id,
    title: eventRow.title,
    description: "",
    date: eventRow.date,
    time: null,
    location: null,
    audience: null,
    theme: null,
    status: "scheduled",
    category: null,
    event_type: null,
    communication_strategy: null,
    calendar_import_id: null,
    event_owner: null,
    budget: null,
    volunteer_needs: null,
    planning_quick_links: eventRow.planning_quick_links,
    created_at: "",
    updated_at: null,
  } as EventRow);

  const eventLink = resolveEventShareLink(event);
  const siteBaseUrl = resolveSiteBaseUrl();
  const postKitUrl = `${siteBaseUrl}/events/${input.eventId}#publish`;
  const timezone = (organization.timezone as string) ?? "America/Chicago";

  const emailContent = await buildStoryReminderEmail({
    eventTitle: eventRow.title as string,
    milestoneTitle: step.title as string,
    scheduledLabel: formatScheduledLabel(scheduledFor.toISOString(), timezone),
    storyCaption,
    feedCaption,
    eventLink,
    postKitUrl,
    storyArtworkUrl,
    organizationName: (organization.name as string) ?? "Your organization",
  });

  const sendResult = await sendEmail({
    to: recipients,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    attachments: emailContent.attachments,
  });

  if (!sendResult.success) {
    return { success: false, error: sendResult.error ?? "Failed to send email." };
  }

  await markReminderSent(step.id as string);

  return { success: true, recipients: recipients.length };
}
