import { playbookRelativeDay } from "./campaign-timing.ts";
import { addDaysToDateOnly, normalizeDateOnly } from "../utils/dates.ts";
import type { CampaignBuilderSession } from "./types.ts";

/**
 * Keep Campaign Date bound to the real event, and shift post/schedule dates
 * by the same delta so relative timing (2 weeks before, etc.) stays correct.
 */
export function resyncSessionToEventDate(
  session: CampaignBuilderSession,
  eventDate: string,
): CampaignBuilderSession {
  const nextEventDate = normalizeDateOnly(eventDate);
  const previousEventDate = normalizeDateOnly(
    session.inspiration.eventDate || nextEventDate,
  );

  if (previousEventDate === nextEventDate) {
    if (session.inspiration.eventDate === nextEventDate) {
      return session;
    }
    return {
      ...session,
      inspiration: {
        ...session.inspiration,
        eventDate: nextEventDate,
      },
    };
  }

  const deltaDays = playbookRelativeDay(previousEventDate, nextEventDate);

  return {
    ...session,
    inspiration: {
      ...session.inspiration,
      eventDate: nextEventDate,
    },
    milestones: session.milestones.map((milestone) => ({
      ...milestone,
      suggestedDate: addDaysToDateOnly(milestone.suggestedDate, deltaDays),
    })),
    previewContents: session.previewContents.map((preview) => ({
      ...preview,
      scheduleDate: addDaysToDateOnly(preview.scheduleDate, deltaDays),
      emailSendDate: addDaysToDateOnly(preview.emailSendDate, deltaDays),
    })),
  };
}
