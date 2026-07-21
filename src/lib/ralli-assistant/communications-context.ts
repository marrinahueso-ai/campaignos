import "server-only";

import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import {
  emptyCommunicationsSection,
  emptyOrgCommunicationsSection,
  type CommsDraftSummary,
  type CommsStepSummary,
  type CommunicationsContextSection,
  type OrgCommunicationsContextSection,
  type OrgCommunicationsEventSummary,
} from "@/lib/ralli-assistant/communications-format";
import {
  getDueTodaySteps,
  getOverdueSteps,
  getUpcomingSteps,
} from "@/lib/playbooks/health";
import { getEventCommunicationSteps } from "@/lib/playbooks/queries";
import { createClient } from "@/lib/supabase/server";
import type { EventCommunicationStep } from "@/types/playbooks";
import {
  addDaysToDateOnly,
  getTodayDateString,
} from "@/lib/utils/dates";

export type {
  CommsDraftSummary,
  CommsStepSummary,
  CommunicationsContextSection,
  OrgCommunicationsContextSection,
  OrgCommunicationsEventSummary,
} from "@/lib/ralli-assistant/communications-format";
export {
  communicationsEventLinks,
  emptyCommunicationsSection,
  emptyOrgCommunicationsSection,
  formatCommunicationsSectionLines,
  formatOrgCommunicationsSectionLines,
  serializeCommunicationsForPrompt,
  serializeOrgCommunicationsForPrompt,
} from "@/lib/ralli-assistant/communications-format";

function isAbsentTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return isMissingSchemaError(error) || error.code === "42P01";
}

function toStepSummary(step: EventCommunicationStep): CommsStepSummary {
  return {
    id: step.id,
    title: step.title,
    channel: step.channel,
    dueDate: step.dueDate,
    status: step.status,
  };
}

function isVolunteerReminderStep(step: EventCommunicationStep): boolean {
  if (step.channel === "volunteer_signup") return true;
  return /\bvolunteer\b/i.test(step.title) && /\bremind/i.test(step.title);
}

async function loadDraftCommunicationItems(eventId: string): Promise<{
  draftEmails: CommsDraftSummary[];
  draftFlyers: CommsDraftSummary[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_items")
    .select("id, channel, status")
    .eq("event_id", eventId)
    .in("status", ["draft", "generated", "changes_requested"])
    .limit(40);

  if (error && !isAbsentTable(error)) {
    console.error("Ask Ralli comms: communication_items failed", error.message);
    return { draftEmails: [], draftFlyers: [] };
  }

  const draftEmails: CommsDraftSummary[] = [];
  const draftFlyers: CommsDraftSummary[] = [];
  for (const row of data ?? []) {
    const channel = String(row.channel ?? "");
    const status = String(row.status ?? "draft");
    const item: CommsDraftSummary = {
      id: String(row.id),
      label: `${channel} (${status})`,
      channel,
      status,
    };
    if (channel === "email" || channel === "newsletter") {
      draftEmails.push(item);
    }
    if (channel === "flyer") {
      draftFlyers.push(item);
    }
  }
  return {
    draftEmails: draftEmails.slice(0, 8),
    draftFlyers: draftFlyers.slice(0, 8),
  };
}

async function countFacebookPublishedOrPosted(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select("id, platforms, workflow_status, milestone_name")
    .eq("event_id", eventId)
    .in("workflow_status", ["posted", "published"])
    .limit(40);

  if (error && !isAbsentTable(error)) {
    return 0;
  }

  let count = 0;
  for (const row of data ?? []) {
    const platforms = Array.isArray(row.platforms)
      ? row.platforms.map((p) => String(p).toLowerCase())
      : [];
    const name = String(row.milestone_name ?? "").toLowerCase();
    const isFacebook =
      platforms.includes("facebook") || name.includes("facebook");
    const isInstagramOnly =
      (platforms.includes("instagram") || name.includes("instagram")) &&
      !isFacebook;
    if (isInstagramOnly) continue;
    if (isFacebook || platforms.length === 0) {
      count += 1;
    }
  }
  return count;
}

/**
 * Event-scoped communications pack from playbook steps + drafts + Meta schedule status.
 * Fail soft — empty sections on errors.
 */
export async function loadCommunicationsContextForEvent(
  eventId: string,
): Promise<CommunicationsContextSection> {
  const unavailable = [
    "Family / parent email open or view counts",
    "Meta post performance (reach, best-performing post) — Insights later",
  ];
  const tomorrow = addDaysToDateOnly(getTodayDateString(), 1);

  try {
    const [steps, drafts, facebookPublishedOrPosted] = await Promise.all([
      getEventCommunicationSteps(eventId).catch(
        () => [] as EventCommunicationStep[],
      ),
      loadDraftCommunicationItems(eventId),
      countFacebookPublishedOrPosted(eventId).catch(() => 0),
    ]);

    if (steps.length === 0) {
      return {
        ...emptyCommunicationsSection([
          ...unavailable,
          "No communication playbook steps found for this event",
        ]),
        playbookStepsLoaded: true,
        draftEmails: drafts.draftEmails,
        draftFlyers: drafts.draftFlyers,
      };
    }

    const emailSteps = steps.filter(
      (step) => step.channel === "email" || step.channel === "newsletter",
    );
    const facebookSteps = steps.filter((step) => step.channel === "facebook");
    const instagramSteps = steps.filter((step) => step.channel === "instagram");
    const flyerSteps = steps.filter((step) => step.channel === "flyer");
    const volunteerSteps = steps.filter(isVolunteerReminderStep);

    const upcomingSocial = [...facebookSteps, ...instagramSteps]
      .filter((step) => step.status === "upcoming")
      .map(toStepSummary)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const dueToday = getDueTodaySteps(steps).map(toStepSummary);
    const overdue = getOverdueSteps(steps).map(toStepSummary);
    const upcoming = getUpcomingSteps(steps, 8).map(toStepSummary);
    const dueTomorrow = steps
      .filter((step) => step.status === "upcoming" && step.dueDate === tomorrow)
      .map(toStepSummary);
    const nextDue = upcoming[0] ?? null;

    const missingFlyers = flyerSteps
      .filter((step) => step.status === "upcoming")
      .map(toStepSummary);

    return {
      playbookStepsLoaded: true,
      stepCount: steps.length,
      email: {
        completedCount: emailSteps.filter((s) => s.status === "completed").length,
        upcomingCount: emailSteps.filter((s) => s.status === "upcoming").length,
        completed: emailSteps
          .filter((s) => s.status === "completed")
          .map(toStepSummary)
          .slice(0, 6),
        upcoming: emailSteps
          .filter((s) => s.status === "upcoming")
          .map(toStepSummary)
          .slice(0, 6),
      },
      facebook: {
        completedCount: facebookSteps.filter((s) => s.status === "completed")
          .length,
        upcomingCount: facebookSteps.filter((s) => s.status === "upcoming")
          .length,
        publishedOrPostedCount: facebookPublishedOrPosted,
        completed: facebookSteps
          .filter((s) => s.status === "completed")
          .map(toStepSummary)
          .slice(0, 6),
        upcoming: facebookSteps
          .filter((s) => s.status === "upcoming")
          .map(toStepSummary)
          .slice(0, 6),
      },
      instagram: {
        completedCount: instagramSteps.filter((s) => s.status === "completed")
          .length,
        upcomingCount: instagramSteps.filter((s) => s.status === "upcoming")
          .length,
        completed: instagramSteps
          .filter((s) => s.status === "completed")
          .map(toStepSummary)
          .slice(0, 6),
        upcoming: instagramSteps
          .filter((s) => s.status === "upcoming")
          .map(toStepSummary)
          .slice(0, 6),
      },
      socialMissing: upcomingSocial.slice(0, 8),
      dueToday: dueToday.slice(0, 6),
      dueTomorrow: dueTomorrow.slice(0, 6),
      nextDue,
      overdue: overdue.slice(0, 6),
      volunteerReminders: {
        completedCount: volunteerSteps.filter((s) => s.status === "completed")
          .length,
        upcomingCount: volunteerSteps.filter((s) => s.status === "upcoming")
          .length,
        upcoming: volunteerSteps
          .filter((s) => s.status === "upcoming")
          .map(toStepSummary)
          .slice(0, 6),
      },
      draftEmails: drafts.draftEmails,
      missingFlyers: missingFlyers.slice(0, 8),
      draftFlyers: drafts.draftFlyers,
      unavailable,
    };
  } catch (error) {
    console.error("Ask Ralli comms: event context failed", error);
    return emptyCommunicationsSection([
      ...unavailable,
      "Communications data could not be loaded just now",
    ]);
  }
}

/**
 * Org-level communications aggregate across active events (capped). Fail soft.
 */
export async function loadCommunicationsContextForOrg(input: {
  events: Array<{ id: string; title: string }>;
  limit?: number;
}): Promise<OrgCommunicationsContextSection> {
  const unavailable = [
    "Family / parent email open or view counts",
    "Meta post performance (reach, best-performing post) — Insights later",
  ];
  const limit = input.limit ?? 8;
  const slice = input.events.slice(0, limit);
  if (slice.length === 0) {
    return emptyOrgCommunicationsSection(unavailable);
  }

  const packs = await Promise.all(
    slice.map(async (event) => {
      const pack = await loadCommunicationsContextForEvent(event.id);
      return { event, pack };
    }),
  );

  let eventsWithPlaybooks = 0;
  let socialMissingTotal = 0;
  let draftEmailTotal = 0;
  let missingFlyerTotal = 0;
  let dueTodayTotal = 0;
  const eventsWithGaps: OrgCommunicationsEventSummary[] = [];

  for (const { event, pack } of packs) {
    if (pack.stepCount > 0) eventsWithPlaybooks += 1;
    socialMissingTotal += pack.socialMissing.length;
    draftEmailTotal += pack.draftEmails.length;
    missingFlyerTotal += pack.missingFlyers.length + pack.draftFlyers.length;
    dueTodayTotal += pack.dueToday.length;

    if (
      pack.socialMissing.length > 0 ||
      pack.draftEmails.length > 0 ||
      pack.missingFlyers.length > 0 ||
      pack.draftFlyers.length > 0 ||
      pack.dueToday.length > 0 ||
      pack.overdue.length > 0
    ) {
      eventsWithGaps.push({
        eventId: event.id,
        eventTitle: event.title,
        socialMissingCount: pack.socialMissing.length,
        draftEmailCount: pack.draftEmails.length,
        missingFlyerCount:
          pack.missingFlyers.length + pack.draftFlyers.length,
        nextDueTitle: pack.nextDue?.title ?? null,
        nextDueDate: pack.nextDue?.dueDate ?? null,
      });
    }
  }

  eventsWithGaps.sort((a, b) => {
    const score = (row: OrgCommunicationsEventSummary) =>
      row.socialMissingCount * 2 +
      row.draftEmailCount +
      row.missingFlyerCount;
    return score(b) - score(a);
  });

  return {
    eventsWithPlaybooks,
    eventsWithGaps: eventsWithGaps.slice(0, 8),
    socialMissingTotal,
    draftEmailTotal,
    missingFlyerTotal,
    dueTodayTotal,
    unavailable,
  };
}
