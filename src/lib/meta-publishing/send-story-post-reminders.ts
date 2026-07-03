import "server-only";

import {
  buildArtworkPhaseItemsFromMilestones,
  isApprovedArtworkAsset,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import { META_SOCIAL_CHANNELS } from "@/lib/campaign-plan/resolve-plan-milestones";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { mapEventAssetRows } from "@/lib/event-workspace/mappers";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import {
  getFeedCaptionForMilestone,
  getStoryCaptionForMilestone,
} from "@/lib/meta-captions/queries";
import { mapMetaSocialCaptionRow } from "@/lib/meta-captions/mappers";
import { buildStoryReminderEmail } from "@/lib/meta-publishing/story-reminder-email";
import { resolveEventShareLink } from "@/lib/meta-publishing/post-kit";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapEventRow } from "@/lib/events/mappers";
import type { EventRow } from "@/types";
import type { MetaSocialCaptionRow } from "@/lib/meta-captions/types";
import type { CommunicationChannel, EventAssetRow } from "@/types/event-workspace";
import type { EventCommunicationStepRow } from "@/types/playbooks";
import type { SupabaseClient } from "@supabase/supabase-js";

const LOOKAHEAD_HOURS = 24;
const CATCHUP_HOURS = 24;

export interface StoryPostReminderResult {
  scannedSteps: number;
  eligibleSteps: number;
  sentReminders: number;
  skippedNoRecipients: number;
  skippedNotConfigured: number;
  errors: string[];
}

type CandidateStep = EventCommunicationStepRow & {
  event: {
    id: string;
    title: string;
    date: string;
    planning_quick_links: Record<string, unknown> | null;
    school_year_id: string | null;
  };
  organization: {
    id: string;
    name: string;
    timezone: string;
  };
};

function resolveSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://campaignos-six.vercel.app"
  );
}

function resolveReminderHoursBefore(): number {
  const parsed = Number(process.env.STORY_REMINDER_HOURS_BEFORE ?? "24");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }
  return parsed;
}

function defaultScheduledTime(dueDate: string | null): Date | null {
  if (!dueDate) {
    return null;
  }

  const dateOnly = dueDate.slice(0, 10);
  return new Date(`${dateOnly}T10:00:00.000Z`);
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

function isMetaSocialChannel(channel: CommunicationChannel | null | undefined): boolean {
  return Boolean(channel && META_SOCIAL_CHANNELS.includes(channel));
}

function isEligibleForReminder(scheduledFor: Date, now: Date, hoursBefore: number): boolean {
  const msUntil = scheduledFor.getTime() - now.getTime();

  if (msUntil <= 0) {
    const hoursSince = Math.abs(msUntil) / 3_600_000;
    return hoursSince <= CATCHUP_HOURS;
  }

  if (msUntil > LOOKAHEAD_HOURS * 3_600_000) {
    return false;
  }

  const remindAfter = new Date(scheduledFor.getTime() - hoursBefore * 3_600_000);
  return remindAfter <= now;
}

async function loadCandidateSteps(
  supabase: SupabaseClient,
): Promise<CandidateStep[]> {
  const { data: steps, error } = await supabase
    .from("event_communication_steps")
    .select("*")
    .eq("story_manual_publish", true)
    .in("meta_publish_surfaces", ["both", "story_only"])
    .neq("status", "skipped")
    .is("story_reminder_sent_at", null);

  if (error) {
    console.error("Failed to load story reminder steps:", error.message);
    return [];
  }

  const metaSteps = ((steps ?? []) as EventCommunicationStepRow[]).filter((step) =>
    isMetaSocialChannel(step.channel),
  );

  if (metaSteps.length === 0) {
    return [];
  }

  const eventIds = [...new Set(metaSteps.map((step) => step.event_id))];
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, date, planning_quick_links, school_year_id")
    .in("id", eventIds)
    .neq("status", "archived");

  if (eventsError) {
    console.error("Failed to load events for story reminders:", eventsError.message);
    return [];
  }

  const eventRows = (events ?? []) as Array<
    Pick<EventRow, "id" | "title" | "date" | "planning_quick_links"> & {
      school_year_id: string | null;
    }
  >;
  const eventById = new Map(eventRows.map((event) => [event.id, event]));

  const schoolYearIds = [
    ...new Set(
      eventRows
        .map((event) => event.school_year_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const orgBySchoolYearId = new Map<
    string,
    { id: string; name: string; timezone: string }
  >();

  if (schoolYearIds.length > 0) {
    const { data: schoolYears, error: schoolYearsError } = await supabase
      .from("school_years")
      .select("id, organization_id")
      .in("id", schoolYearIds);

    if (schoolYearsError) {
      console.error(
        "Failed to load school years for story reminders:",
        schoolYearsError.message,
      );
      return [];
    }

    const organizationIds = [
      ...new Set(
        (schoolYears ?? [])
          .map((row) => row.organization_id as string)
          .filter(Boolean),
      ),
    ];

    const { data: organizations, error: organizationsError } = await supabase
      .from("organizations")
      .select("id, name, timezone")
      .in("id", organizationIds);

    if (organizationsError) {
      console.error(
        "Failed to load organizations for story reminders:",
        organizationsError.message,
      );
      return [];
    }

    const orgById = new Map(
      (organizations ?? []).map((org) => [
        org.id as string,
        {
          id: org.id as string,
          name: (org.name as string) ?? "Your organization",
          timezone: (org.timezone as string) ?? "America/Chicago",
        },
      ]),
    );

    for (const schoolYear of schoolYears ?? []) {
      const organization = orgById.get(schoolYear.organization_id as string);
      if (organization) {
        orgBySchoolYearId.set(schoolYear.id as string, organization);
      }
    }
  }

  const candidates: CandidateStep[] = [];

  for (const step of metaSteps) {
    const event = eventById.get(step.event_id);
    if (!event?.school_year_id) {
      continue;
    }

    const organization = orgBySchoolYearId.get(event.school_year_id);
    if (!organization) {
      continue;
    }

    if (!isStorySurfaceEnabled(step.meta_publish_surfaces ?? "both")) {
      continue;
    }

    candidates.push({
      ...step,
      event: {
        ...event,
        planning_quick_links: event.planning_quick_links ?? null,
      },
      organization,
    });
  }

  return candidates;
}

async function resolveScheduledFor(
  supabase: SupabaseClient,
  step: CandidateStep,
): Promise<Date | null> {
  const { data: slot } = await supabase
    .from("meta_publication_slots")
    .select("scheduled_for")
    .eq("event_id", step.event_id)
    .eq("relative_day", step.relative_day)
    .not("scheduled_for", "is", null)
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (slot?.scheduled_for) {
    return new Date(slot.scheduled_for as string);
  }

  return defaultScheduledTime(step.due_date);
}

async function resolveStoryArtworkUrl(
  supabase: SupabaseClient,
  step: CandidateStep,
): Promise<string | null> {
  const { data: assetsData, error } = await supabase
    .from("event_assets")
    .select("*")
    .eq("event_id", step.event_id)
    .order("updated_at", { ascending: false });

  if (error) {
    return null;
  }

  const assets = mapEventAssetRows((assetsData ?? []) as EventAssetRow[]);
  const phaseItems = buildArtworkPhaseItemsFromMilestones([
    { relativeDay: step.relative_day, title: step.title },
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

async function loadCaptionsForStep(
  supabase: SupabaseClient,
  step: CandidateStep,
): Promise<{ feedCaption: string | null; storyCaption: string | null }> {
  const { data, error } = await supabase
    .from("meta_social_captions")
    .select("*")
    .eq("event_id", step.event_id)
    .eq("relative_day", step.relative_day);

  if (error) {
    return { feedCaption: null, storyCaption: null };
  }

  const captions = ((data ?? []) as MetaSocialCaptionRow[]).map(mapMetaSocialCaptionRow);

  return {
    feedCaption: getFeedCaptionForMilestone(captions, step.relative_day),
    storyCaption: getStoryCaptionForMilestone(captions, step.relative_day),
  };
}

async function getStoryReminderRecipients(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string[]> {
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

async function markReminderSent(
  supabase: SupabaseClient,
  stepId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("event_communication_steps")
    .update({ story_reminder_sent_at: now, updated_at: now })
    .eq("id", stepId);
}

export async function sendStoryPostReminders(): Promise<StoryPostReminderResult> {
  const result: StoryPostReminderResult = {
    scannedSteps: 0,
    eligibleSteps: 0,
    sentReminders: 0,
    skippedNoRecipients: 0,
    skippedNotConfigured: 0,
    errors: [],
  };

  if (!isEmailConfigured()) {
    result.skippedNotConfigured = 1;
    result.errors.push("RESEND_API_KEY is not configured.");
    return result;
  }

  const supabase = createAdminClient();
  const candidates = await loadCandidateSteps(supabase);
  result.scannedSteps = candidates.length;

  const now = new Date();
  const hoursBefore = resolveReminderHoursBefore();
  const siteBaseUrl = resolveSiteBaseUrl();

  for (const step of candidates) {
    const scheduledFor = await resolveScheduledFor(supabase, step);
    if (!scheduledFor || !isEligibleForReminder(scheduledFor, now, hoursBefore)) {
      continue;
    }

    result.eligibleSteps += 1;

    const recipients = await getStoryReminderRecipients(supabase, step.organization.id);
    if (recipients.length === 0) {
      result.skippedNoRecipients += 1;
      result.errors.push(
        `Step ${step.id}: no active admin/VP Communications recipients for org ${step.organization.id}.`,
      );
      continue;
    }

    const { feedCaption, storyCaption } = await loadCaptionsForStep(supabase, step);
    const storyArtworkUrl = await resolveStoryArtworkUrl(supabase, step);
    const event = mapEventRow({
      id: step.event.id,
      title: step.event.title,
      description: "",
      date: step.event.date,
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
      planning_quick_links: step.event.planning_quick_links,
      created_at: "",
      updated_at: null,
    } as EventRow);
    const eventLink = resolveEventShareLink(event);
    const scheduledIso = scheduledFor.toISOString();
    const postKitUrl = `${siteBaseUrl}/events/${step.event_id}#publish`;

    const emailContent = await buildStoryReminderEmail({
      eventTitle: step.event.title,
      milestoneTitle: step.title,
      scheduledLabel: formatScheduledLabel(scheduledIso, step.organization.timezone),
      storyCaption,
      feedCaption,
      eventLink,
      postKitUrl,
      storyArtworkUrl,
      organizationName: step.organization.name,
    });

    const sendResult = await sendEmail({
      to: recipients,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments: emailContent.attachments,
    });

    if (!sendResult.success) {
      result.errors.push(
        `Step ${step.id} (${step.event.title} / ${step.title}): ${sendResult.error ?? "send failed"}`,
      );
      continue;
    }

    await markReminderSent(supabase, step.id);
    result.sentReminders += 1;
  }

  return result;
}
