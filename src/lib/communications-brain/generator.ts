import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

export interface DraftGenerationContext {
  event: Event;
  playbookName: string;
  step: EventCommunicationStep;
  organizationName: string | null;
}

function schoolLabel(orgName: string | null): string {
  return orgName ?? "our school";
}

function ptoLabel(orgName: string | null): string {
  return orgName ? `${orgName} PTO` : "our PTO";
}

function eventWhen(event: Event): string {
  const date = formatEventDate(event.date);
  const time = formatEventTime(event.time);
  return time ? `${date} at ${time}` : date;
}

function locationPhrase(event: Event): string {
  return event.location ? ` at ${event.location}` : "";
}

function audiencePhrase(event: Event): string {
  return event.audience ?? "all families and staff";
}

function timingTone(relativeDay: number): "early" | "mid" | "urgent" | "day_of" | "thanks" {
  if (relativeDay >= 1) return "thanks";
  if (relativeDay === 0) return "day_of";
  if (relativeDay >= -3) return "urgent";
  if (relativeDay >= -14) return "mid";
  return "early";
}

function openingForTone(
  tone: ReturnType<typeof timingTone>,
  event: Event,
  stepTitle: string,
): string {
  switch (tone) {
    case "early":
      return `Mark your calendars! ${event.title} is coming up on ${eventWhen(event)}.`;
    case "mid":
      return `${event.title} is getting closer — ${stepTitle.toLowerCase()} reminder for ${eventWhen(event)}.`;
    case "urgent":
      return `Almost time! ${event.title} is just around the corner on ${eventWhen(event)}.`;
    case "day_of":
      return `It's here! ${event.title} is happening today${locationPhrase(event)}.`;
    case "thanks":
      return `Thank you, ${audiencePhrase(event)}, for making ${event.title} a success!`;
  }
}

function channelBody(
  channel: CommunicationChannel,
  ctx: DraftGenerationContext,
  tone: ReturnType<typeof timingTone>,
  opening: string,
): string {
  const { event, playbookName, step, organizationName } = ctx;
  const school = schoolLabel(organizationName);
  const pto = ptoLabel(organizationName);
  const desc = event.description?.trim();
  const theme = event.theme ? ` Theme: ${event.theme}.` : "";
  const volunteers = event.volunteerNeeds
    ? ` Volunteers still needed — ${event.volunteerNeeds}.`
    : "";

  switch (channel) {
    case "website_announcement":
      return `${opening}

${pto} invites ${audiencePhrase(event)} to join us for ${event.title}${locationPhrase(event)} on ${eventWhen(event)}.${theme}${desc ? `\n\n${desc}` : ""}

This communication is part of our ${playbookName} plan (${step.title}). Check back for updates as the event approaches.`;

    case "newsletter":
      return `${opening}

${desc ?? `${event.title} is an important part of our ${school} community calendar.`}${locationPhrase(event) ? ` Location: ${event.location}.` : ""}${volunteers}

— ${pto}`;

    case "facebook":
      return `${opening} 📚✨

Join ${audiencePhrase(event)} ${eventWhen(event)}${locationPhrase(event)}. ${desc ? desc.split(".")[0] + "." : "We would love to see you there!"}${volunteers}

#${school.replace(/\s+/g, "")}PTO #SchoolCommunity`;

    case "instagram":
      return `${opening} ✨

${event.title} · ${formatEventDate(event.date)}${locationPhrase(event) ? ` · ${event.location}` : ""}

${desc ? desc.slice(0, 120) + (desc.length > 120 ? "…" : "") : "Save the date and share with a friend!"}`;

    case "email":
      return `Subject: ${event.title} — ${step.title}

Hi ${audiencePhrase(event)},

${opening}

${desc ?? `${pto} is preparing for ${event.title} and wanted to share a friendly reminder.`}${locationPhrase(event) ? `\n\nWhere: ${event.location}` : ""}${event.time ? `\nWhen: ${eventWhen(event)}` : ""}${volunteers}

Thank you for supporting ${school}!

— ${pto}`;

    case "flyer":
      return `${event.title.toUpperCase()}
${step.title} · ${formatEventDate(event.date)}

${opening}

${desc ?? "Join us for a wonderful school community event."}${locationPhrase(event) ? `\nLocation: ${event.location}` : ""}${event.time ? `\nTime: ${formatEventTime(event.time)}` : ""}

Questions? Contact ${pto}.`;

    case "principal_notes":
      return `Staff Announcement — ${event.title}

${opening} Please help us share this with families as appropriate.

Event: ${event.title}
Date: ${eventWhen(event)}${event.location ? `\nLocation: ${event.location}` : ""}
Audience: ${audiencePhrase(event)}

${desc ?? `${pto} appreciates your support spreading the word.`}`;

    case "morning_announcements":
      return tone === "day_of"
        ? `Good morning! ${event.title} is today${locationPhrase(event)}. ${audiencePhrase(event)}, we hope to see you there!`
        : tone === "urgent"
          ? `Reminder: ${event.title} is coming up on ${formatEventDate(event.date)}${locationPhrase(event)}. Tell your families!`
          : `${event.title} is scheduled for ${formatEventDate(event.date)}. Mark your calendars!`;

    case "volunteer_signup":
      return event.volunteerNeeds?.trim()
        ? `${opening}

${pto} is looking for volunteers for ${event.title}.${volunteers}

Event details: ${eventWhen(event)}${locationPhrase(event)}.`
        : `${opening}

${pto} is preparing for ${event.title}.

Event details: ${eventWhen(event)}${locationPhrase(event)}. Contact ${pto} for more information.`;

    default:
      return `${opening}\n\n${desc ?? `Details for ${event.title} will be shared soon.`}`;
  }
}

export function generatePlaceholderDraft(ctx: DraftGenerationContext): string {
  const tone = timingTone(ctx.step.relativeDay);
  const opening = openingForTone(tone, ctx.event, ctx.step.title);
  const body = channelBody(ctx.step.channel, ctx, tone, opening);

  return `${body.trim()}\n\n— Draft generated by CampaignOS`;
}

export function isPersistableStepId(stepId: string): boolean {
  return !stepId.startsWith("mock-step-");
}
