import type { CommunicationChannel } from "@/types/event-workspace";
import type { ProductHelpLink } from "./product-help-knowledge.ts";

export type CommsStepSummary = {
  id: string;
  title: string;
  channel: CommunicationChannel;
  dueDate: string;
  status: string;
};

export type CommsDraftSummary = {
  id: string;
  label: string;
  channel: string;
  status: string;
};

export type CommunicationsContextSection = {
  playbookStepsLoaded: boolean;
  stepCount: number;
  email: {
    completedCount: number;
    upcomingCount: number;
    completed: CommsStepSummary[];
    upcoming: CommsStepSummary[];
  };
  facebook: {
    completedCount: number;
    upcomingCount: number;
    publishedOrPostedCount: number;
    completed: CommsStepSummary[];
    upcoming: CommsStepSummary[];
  };
  instagram: {
    completedCount: number;
    upcomingCount: number;
    completed: CommsStepSummary[];
    upcoming: CommsStepSummary[];
  };
  socialMissing: CommsStepSummary[];
  dueToday: CommsStepSummary[];
  dueTomorrow: CommsStepSummary[];
  nextDue: CommsStepSummary | null;
  overdue: CommsStepSummary[];
  volunteerReminders: {
    completedCount: number;
    upcomingCount: number;
    upcoming: CommsStepSummary[];
  };
  draftEmails: CommsDraftSummary[];
  missingFlyers: CommsStepSummary[];
  draftFlyers: CommsDraftSummary[];
  unavailable: string[];
};

export type OrgCommunicationsEventSummary = {
  eventId: string;
  eventTitle: string;
  socialMissingCount: number;
  draftEmailCount: number;
  missingFlyerCount: number;
  nextDueTitle: string | null;
  nextDueDate: string | null;
};

export type OrgCommunicationsContextSection = {
  eventsWithPlaybooks: number;
  eventsWithGaps: OrgCommunicationsEventSummary[];
  socialMissingTotal: number;
  draftEmailTotal: number;
  missingFlyerTotal: number;
  dueTodayTotal: number;
  unavailable: string[];
};

export function emptyCommunicationsSection(
  unavailable: string[] = [],
): CommunicationsContextSection {
  return {
    playbookStepsLoaded: false,
    stepCount: 0,
    email: {
      completedCount: 0,
      upcomingCount: 0,
      completed: [],
      upcoming: [],
    },
    facebook: {
      completedCount: 0,
      upcomingCount: 0,
      publishedOrPostedCount: 0,
      completed: [],
      upcoming: [],
    },
    instagram: {
      completedCount: 0,
      upcomingCount: 0,
      completed: [],
      upcoming: [],
    },
    socialMissing: [],
    dueToday: [],
    dueTomorrow: [],
    nextDue: null,
    overdue: [],
    volunteerReminders: {
      completedCount: 0,
      upcomingCount: 0,
      upcoming: [],
    },
    draftEmails: [],
    missingFlyers: [],
    draftFlyers: [],
    unavailable,
  };
}

export function emptyOrgCommunicationsSection(
  unavailable: string[] = [],
): OrgCommunicationsContextSection {
  return {
    eventsWithPlaybooks: 0,
    eventsWithGaps: [],
    socialMissingTotal: 0,
    draftEmailTotal: 0,
    missingFlyerTotal: 0,
    dueTodayTotal: 0,
    unavailable,
  };
}

/** Deterministic communications lines for event ops answers. */
export function formatCommunicationsSectionLines(
  section: CommunicationsContextSection,
): string[] {
  const lines: string[] = [];

  if (!section.playbookStepsLoaded || section.stepCount === 0) {
    lines.push(
      "Communications: no playbook steps found yet — assign a playbook or open the Communications Hub.",
    );
  } else {
    if (section.email.completedCount > 0 && section.email.upcomingCount === 0) {
      lines.push(
        `Families email: playbook email/newsletter steps look completed (${section.email.completedCount}).`,
      );
    } else if (section.email.upcomingCount > 0) {
      lines.push(
        `Families email: ${section.email.upcomingCount} email/newsletter step${
          section.email.upcomingCount === 1 ? "" : "s"
        } still upcoming${
          section.email.upcoming[0]
            ? ` — next: ${section.email.upcoming[0].title}`
            : ""
        }.`,
      );
    } else {
      lines.push("Families email: no email/newsletter playbook steps on this event.");
    }

    if (
      section.facebook.completedCount > 0 ||
      section.facebook.publishedOrPostedCount > 0
    ) {
      lines.push(
        `Facebook: ${section.facebook.completedCount} playbook step${
          section.facebook.completedCount === 1 ? "" : "s"
        } marked completed; ${section.facebook.publishedOrPostedCount} Meta scheduling item${
          section.facebook.publishedOrPostedCount === 1 ? "" : "s"
        } posted/published.`,
      );
    } else if (section.facebook.upcomingCount > 0) {
      lines.push(
        `Facebook: not posted yet — ${section.facebook.upcomingCount} upcoming Facebook step${
          section.facebook.upcomingCount === 1 ? "" : "s"
        }.`,
      );
    } else {
      lines.push("Facebook: no Facebook playbook steps on this event.");
    }

    if (section.socialMissing.length > 0) {
      lines.push(
        `Missing social posts (${section.socialMissing.length}): ${section.socialMissing
          .slice(0, 4)
          .map((step) => `${step.title} (${step.channel}, due ${step.dueDate})`)
          .join("; ")}.`,
      );
    } else {
      lines.push("Missing social posts: none upcoming in the playbook.");
    }

    if (section.dueToday.length > 0) {
      lines.push(
        `Publish / send today: ${section.dueToday
          .map((step) => step.title)
          .join("; ")}.`,
      );
    } else if (section.nextDue) {
      lines.push(
        `Next communication due: ${section.nextDue.title} (${section.nextDue.channel}, ${section.nextDue.dueDate}).`,
      );
    } else {
      lines.push("Next communication due: nothing upcoming in the playbook.");
    }

    if (section.dueTomorrow.length > 0) {
      lines.push(
        `Send tomorrow: ${section.dueTomorrow.map((s) => s.title).join("; ")}.`,
      );
    }

    if (section.volunteerReminders.completedCount > 0) {
      lines.push(
        `Volunteer reminders: ${section.volunteerReminders.completedCount} completed in the playbook.`,
      );
    } else if (section.volunteerReminders.upcomingCount > 0) {
      lines.push(
        `Volunteer reminders: ${section.volunteerReminders.upcomingCount} still upcoming.`,
      );
    } else {
      lines.push(
        "Volunteer reminders: no volunteer-reminder playbook steps found on this event.",
      );
    }

    if (section.draftEmails.length > 0) {
      lines.push(
        `Draft emails: ${section.draftEmails.length} still in draft/generated (${section.draftEmails
          .slice(0, 3)
          .map((d) => d.label)
          .join("; ")}).`,
      );
    } else {
      lines.push("Draft emails: none found in communication items.");
    }

    const flyerGap =
      section.missingFlyers.length + section.draftFlyers.length;
    if (flyerGap > 0) {
      const parts: string[] = [];
      if (section.missingFlyers.length > 0) {
        parts.push(
          `${section.missingFlyers.length} flyer step${
            section.missingFlyers.length === 1 ? "" : "s"
          } still upcoming`,
        );
      }
      if (section.draftFlyers.length > 0) {
        parts.push(
          `${section.draftFlyers.length} flyer draft${
            section.draftFlyers.length === 1 ? "" : "s"
          }`,
        );
      }
      lines.push(`Flyers not done: ${parts.join("; ")}.`);
    } else {
      lines.push("Flyers: no missing flyer steps or drafts found.");
    }
  }

  lines.push(
    `I can’t see yet: ${section.unavailable.slice(0, 2).join("; ")}.`,
  );

  return lines;
}

export function formatOrgCommunicationsSectionLines(
  section: OrgCommunicationsContextSection,
): string[] {
  const lines: string[] = [];
  if (section.eventsWithGaps.length === 0) {
    lines.push(
      section.eventsWithPlaybooks > 0
        ? "Communications: no gaps flagged across the loaded campaigns (social/drafts/flyers)."
        : "Communications: no playbook steps found on the loaded campaigns yet.",
    );
  } else {
    const samples = section.eventsWithGaps
      .slice(0, 4)
      .map((event) => {
        const bits: string[] = [];
        if (event.socialMissingCount > 0) {
          bits.push(`${event.socialMissingCount} social missing`);
        }
        if (event.draftEmailCount > 0) {
          bits.push(`${event.draftEmailCount} draft email`);
        }
        if (event.missingFlyerCount > 0) {
          bits.push(`${event.missingFlyerCount} flyer gap`);
        }
        return `${event.eventTitle} (${bits.join(", ") || "attention"})`;
      })
      .join("; ");
    lines.push(
      `Communications gaps (${section.eventsWithGaps.length}): ${samples}.`,
    );
  }

  lines.push(
    `Totals in loaded window: ${section.socialMissingTotal} missing social, ${section.draftEmailTotal} draft emails, ${section.missingFlyerTotal} flyer gaps, ${section.dueTodayTotal} due today.`,
  );
  lines.push(
    `I can’t see yet: ${section.unavailable.slice(0, 2).join("; ")}.`,
  );
  return lines;
}

export function serializeCommunicationsForPrompt(
  section: CommunicationsContextSection,
): unknown {
  return {
    stepCount: section.stepCount,
    email: {
      completedCount: section.email.completedCount,
      upcomingCount: section.email.upcomingCount,
      upcoming: section.email.upcoming.map((s) => s.title),
    },
    facebook: {
      completedCount: section.facebook.completedCount,
      upcomingCount: section.facebook.upcomingCount,
      publishedOrPostedCount: section.facebook.publishedOrPostedCount,
    },
    socialMissing: section.socialMissing.map((s) => ({
      title: s.title,
      channel: s.channel,
      dueDate: s.dueDate,
    })),
    dueToday: section.dueToday.map((s) => s.title),
    dueTomorrow: section.dueTomorrow.map((s) => s.title),
    nextDue: section.nextDue
      ? {
          title: section.nextDue.title,
          channel: section.nextDue.channel,
          dueDate: section.nextDue.dueDate,
        }
      : null,
    volunteerReminders: section.volunteerReminders,
    draftEmails: section.draftEmails.map((d) => d.label),
    missingFlyers: section.missingFlyers.map((s) => s.title),
    draftFlyers: section.draftFlyers.map((d) => d.label),
    unavailable: section.unavailable,
  };
}

export function serializeOrgCommunicationsForPrompt(
  section: OrgCommunicationsContextSection,
): unknown {
  return {
    eventsWithPlaybooks: section.eventsWithPlaybooks,
    eventsWithGaps: section.eventsWithGaps,
    socialMissingTotal: section.socialMissingTotal,
    draftEmailTotal: section.draftEmailTotal,
    missingFlyerTotal: section.missingFlyerTotal,
    dueTodayTotal: section.dueTodayTotal,
    unavailable: section.unavailable,
  };
}

export function communicationsEventLinks(eventId: string): ProductHelpLink[] {
  return [
    { label: "Communications Hub", href: "/communications" },
    {
      label: "Event page",
      href: `/events/${encodeURIComponent(eventId)}`,
    },
    { label: "Calendar", href: "/calendar" },
  ];
}
