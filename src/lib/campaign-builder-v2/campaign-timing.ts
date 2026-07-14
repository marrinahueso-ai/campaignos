/**
 * Playbook convention: negative = days before event, 0 = event day, positive = after.
 */
export function playbookRelativeDay(
  eventDate: string,
  milestoneDate: string,
): number {
  const event = new Date(`${eventDate}T12:00:00`);
  const milestone = new Date(`${milestoneDate}T12:00:00`);
  return Math.round(
    (milestone.getTime() - event.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export type AudienceFacingTiming = {
  relativeDay: number;
  /** Human schedule summary for the model (internal). */
  scheduleSummary: string;
  /** Short, family-friendly phrases that may appear on the graphic. */
  onGraphicExamples: string[];
  /** How the model should use timing in artwork/captions. */
  guidance: string;
};

/**
 * Translate playbook relative-day offsets into audience-facing countdown language.
 * Milestone names like "Two-Week Push" stay internal — this is what families should see.
 */
export function describeAudienceFacingTiming(
  relativeDay: number,
): AudienceFacingTiming {
  if (!Number.isFinite(relativeDay)) {
    return {
      relativeDay: 0,
      scheduleSummary: "timing unknown",
      onGraphicExamples: [],
      guidance:
        "Do not invent countdown wording if timing is unknown. Focus on the event name and mood.",
    };
  }

  if (relativeDay > 0) {
    const daysAfter = relativeDay;
    return {
      relativeDay,
      scheduleSummary: `${daysAfter} day${daysAfter === 1 ? "" : "s"} after the event`,
      onGraphicExamples: ["Thank you!", "What a day!", "Grateful"],
      guidance:
        "Use warm thank-you / wrap-up language. Do not use countdown phrasing like \"weeks away\".",
    };
  }

  if (relativeDay === 0) {
    return {
      relativeDay,
      scheduleSummary: "event day (today)",
      onGraphicExamples: ["Today!", "It's today!", "See you today"],
      guidance:
        "Include day-of energy in the headline (e.g. Today!). Never paste internal milestone labels.",
    };
  }

  if (relativeDay === -1) {
    return {
      relativeDay,
      scheduleSummary: "1 day before the event",
      onGraphicExamples: ["Tomorrow!", "Almost time!", "One day away"],
      guidance:
        "Include imminent timing in the headline (e.g. Tomorrow! or One day away). Never paste \"Day Before\" as a label.",
    };
  }

  const daysBefore = Math.abs(relativeDay);

  if (daysBefore === 7) {
    return {
      relativeDay,
      scheduleSummary: "7 days before the event (1 week away)",
      onGraphicExamples: ["1 week away", "One week to go!", "Next week"],
      guidance:
        "Include natural countdown wording such as \"1 week away\" or \"One week to go!\" — not the milestone name.",
    };
  }

  if (daysBefore === 14) {
    return {
      relativeDay,
      scheduleSummary: "14 days before the event (2 weeks away)",
      onGraphicExamples: ["2 weeks away", "Only 2 weeks left!", "Two weeks to go"],
      guidance:
        "Include natural countdown wording such as \"2 weeks away\" or \"Only 2 weeks left!\" — not \"Two-Week Push\" or \"Two-Week Reminder\".",
    };
  }

  if (daysBefore % 7 === 0 && daysBefore >= 21) {
    const weeks = daysBefore / 7;
    return {
      relativeDay,
      scheduleSummary: `${daysBefore} days before the event (about ${weeks} weeks away)`,
      onGraphicExamples: [
        `${weeks} weeks away`,
        `Only ${weeks} weeks left!`,
        "Save the date",
      ],
      guidance: `Include natural countdown wording such as "${weeks} weeks away" when it fits. Do not paste the milestone name.`,
    };
  }

  if (daysBefore <= 6) {
    return {
      relativeDay,
      scheduleSummary: `${daysBefore} days before the event`,
      onGraphicExamples: [
        `${daysBefore} days away`,
        `Only ${daysBefore} days left!`,
        "Coming soon",
      ],
      guidance: `Include natural countdown wording such as "${daysBefore} days away" when it fits. Do not paste the milestone name.`,
    };
  }

  return {
    relativeDay,
    scheduleSummary: `${daysBefore} days before the event`,
    onGraphicExamples: [
      `${daysBefore} days away`,
      "Coming soon",
      "Save the date",
    ],
    guidance: `Express that the event is about ${daysBefore} days away with short family-friendly countdown copy. Never paste the internal milestone name.`,
  };
}
