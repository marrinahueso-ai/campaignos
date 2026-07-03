import "server-only";

import { META_SOCIAL_CHANNELS } from "@/lib/campaign-plan/resolve-plan-milestones";
import { isEmailConfigured } from "@/lib/email/send";
import { derivePublishMode, isManualStoryEmailMode } from "@/lib/meta-publishing/publish-mode";
import { sendStoryPostKitForMilestone } from "@/lib/meta-publishing/send-story-post-kit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CommunicationChannel } from "@/types/event-workspace";
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
): Promise<EventCommunicationStepRow[]> {
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

  return ((steps ?? []) as EventCommunicationStepRow[]).filter((step) => {
    if (!isMetaSocialChannel(step.channel)) {
      return false;
    }

    const mode = derivePublishMode(
      step.meta_publish_surfaces ?? "both",
      Boolean(step.story_manual_publish),
    );
    return isManualStoryEmailMode(mode);
  });
}

async function resolveScheduledFor(
  supabase: SupabaseClient,
  step: EventCommunicationStepRow,
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

/** Daily cron backup — sends post kit emails for manual story modes not yet emailed. */
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

  for (const step of candidates) {
    const scheduledFor = await resolveScheduledFor(supabase, step);
    if (!scheduledFor || !isEligibleForReminder(scheduledFor, now, hoursBefore)) {
      continue;
    }

    result.eligibleSteps += 1;

    const sendResult = await sendStoryPostKitForMilestone({
      eventId: step.event_id,
      relativeDay: step.relative_day,
    });

    if (sendResult.skipped) {
      continue;
    }

    if (!sendResult.success) {
      if (sendResult.error?.includes("No admin or VP Communications")) {
        result.skippedNoRecipients += 1;
      }
      result.errors.push(
        `Step ${step.id} (${step.title}): ${sendResult.error ?? "send failed"}`,
      );
      continue;
    }

    result.sentReminders += 1;
  }

  return result;
}
