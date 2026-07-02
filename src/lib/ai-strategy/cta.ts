import type { CampaignStageId, CtaStrategy } from "@/lib/ai-strategy/types";
import {
  hasVerifiedVolunteerNeeds,
  sanitizeVolunteerNeeds,
} from "@/lib/events/volunteer-needs";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { DefaultCtaStyle } from "@/types/organization-intelligence";

export { hasVerifiedVolunteerNeeds } from "@/lib/events/volunteer-needs";

const STAGE_PRIMARY_CTAS: Record<
  CampaignStageId,
  { text: string; action: string }
> = {
  announcement: {
    text: "Make room on the family calendar",
    action: "encourage families to note the verified event date in a warm, human way",
  },
  reminder: {
    text: "We'd love to see you there",
    action: "prompt families to participate using verified event details only — no corporate reminder tone",
  },
  day_before: {
    text: "See you tomorrow",
    action: "confirm verified timing and location with excitement, not memo tone",
  },
  today: {
    text: "Come be part of it today",
    action: "drive immediate attendance using verified event details and day-of energy",
  },
  thank_you: {
    text: "Thank you for making this possible",
    action: "celebrate people and impact — genuine gratitude, not boilerplate",
  },
};

const CHANNEL_CTA_OVERRIDES: Partial<
  Record<CommunicationChannel, Partial<{ text: string; action: string }>>
> = {
  instagram: {
    text: "Tap the link in bio for details",
    action: "drive families to more information online",
  },
  facebook: {
    text: "Share this post with a friend",
    action: "encourage sharing and comments",
  },
  email: {
    text: "Reply with any questions",
    action: "invite a direct response from families",
  },
};

const NON_VOLUNTEER_SECONDARY_CTAS: Partial<
  Record<CampaignStageId, { text: string; action: string }>
> = {
  day_before: {
    text: "Bring a friend or neighbor",
    action: "encourage word-of-mouth attendance",
  },
  today: {
    text: "Share a photo from the event",
    action: "invite social sharing after arrival",
  },
  thank_you: {
    text: "Stay tuned for what's next",
    action: "tease future events or ways to stay involved without inventing specifics",
  },
};

function applyCtaStyle(
  cta: { text: string; action: string },
  style: DefaultCtaStyle | null,
  hasVerifiedVolunteerNeeds: boolean,
): { text: string; action: string } {
  if (!style || style === "direct") return cta;

  switch (style) {
    case "soft_invite":
      return {
        ...cta,
        text: cta.text.replace(/^Join us/i, "We hope you can join us"),
      };
    case "question":
      return {
        text: `Can you join us? ${cta.text.charAt(0).toLowerCase()}${cta.text.slice(1)}`,
        action: cta.action,
      };
    case "link_forward":
      return {
        text: "See details in the link below",
        action: "point readers to more information rather than repeating details",
      };
    case "volunteer_focused":
      if (!hasVerifiedVolunteerNeeds) {
        return cta;
      }
      return {
        text: "Lend a hand — every bit helps",
        action:
          "prioritize verified volunteer needs in the call to action — do not invent roles",
      };
    default:
      return cta;
  }
}

function volunteerSignupPrimary(
  volunteerNeeds: string | null,
): { text: string; action: string } | null {
  if (!volunteerNeeds?.trim()) {
    return null;
  }

  return {
    text: "Sign up to volunteer",
    action: `Invite families using only these verified volunteer needs: ${volunteerNeeds.trim()}`,
  };
}

export function resolveCtaStrategy(input: {
  stageId: CampaignStageId;
  channel: CommunicationChannel;
  defaultCtaStyle: DefaultCtaStyle | null;
  volunteerNeeds: string | null;
}): CtaStrategy {
  const verifiedVolunteerNeeds = sanitizeVolunteerNeeds(input.volunteerNeeds);
  const verified = hasVerifiedVolunteerNeeds(verifiedVolunteerNeeds);
  const volunteerPrimary = volunteerSignupPrimary(verifiedVolunteerNeeds);

  const basePrimary =
    input.channel === "volunteer_signup" && volunteerPrimary
      ? volunteerPrimary
      : {
          ...STAGE_PRIMARY_CTAS[input.stageId],
          ...CHANNEL_CTA_OVERRIDES[input.channel],
        };

  const primary = applyCtaStyle(
    basePrimary,
    verified ? input.defaultCtaStyle : null,
    verified,
  );

  let secondary = NON_VOLUNTEER_SECONDARY_CTAS[input.stageId] ?? null;

  if (input.channel === "volunteer_signup" && !verified) {
    secondary = null;
  }

  if (verified && verifiedVolunteerNeeds && input.stageId !== "thank_you") {
    secondary = {
      text: "Volunteers needed",
      action: `Mention only these verified volunteer needs — do not invent roles or counts: ${verifiedVolunteerNeeds}`,
    };
  }

  return { primary, secondary };
}
