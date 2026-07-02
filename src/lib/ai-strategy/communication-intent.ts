import type {
  CampaignStageId,
  CommunicationIntent,
} from "@/lib/ai-strategy/types";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { CommunicationStrategy } from "@/types/communication-strategy";

const STAGE_INTENTS: Record<CampaignStageId, Omit<CommunicationIntent, "messagingAngle">> = {
  announcement: {
    goal: "help families feel welcomed and curious — paint why this event matters",
    focus: "the most warm or meaningful part of the event, then verified when/where",
    desiredEmotion: "curious, welcomed, and looking forward to it",
  },
  reminder: {
    goal: "re-ignite anticipation — families should feel the moment approaching",
    focus: "fresh emotional angle plus one verified detail not yet emphasized",
    desiredEmotion: "anticipation and belonging",
  },
  day_before: {
    goal: "build excitement for tomorrow — remove friction without sounding like a memo",
    focus: "vivid tomorrow energy plus verified timing and location",
    desiredEmotion: "excited and ready",
  },
  today: {
    goal: "celebrate the day — drive same-day energy and participation",
    focus: "immediate energy, directions, and community pride",
    desiredEmotion: "energy, joy, and togetherness",
  },
  thank_you: {
    goal: "celebrate people and impact — close the campaign with genuine gratitude",
    focus: "who made it special and what it meant for the community",
    desiredEmotion: "grateful, appreciated, and connected",
  },
};

const CHANNEL_ANGLES: Partial<Record<CommunicationChannel, string>> = {
  website_announcement:
    "Informative and welcoming — story first, scannable details second.",
  newsletter:
    "Story-first bulletin tone — emotion and community before logistics.",
  facebook:
    "Warm and conversational — community energy, not corporate reminders.",
  instagram:
    "Fun, energetic, visual — minimal words, maximum feeling.",
  email:
    "Personal note from a trusted parent leader — genuine, not a blast.",
  flyer:
    "Bold headline with feeling — scannable verified essentials.",
  principal_notes:
    "Brief staff talking points — warm, professional, concise.",
  morning_announcements:
    "Short, energetic, natural read-aloud — sounds human over the PA.",
  volunteer_signup:
    "Purpose-driven — impact on students/teachers first, verified ask second.",
};

function strategyAngle(strategy: CommunicationStrategy): string {
  switch (strategy) {
    case "reminder_only":
      return "Keep the campaign lightweight — prioritize clarity over promotion.";
    case "calendar_only":
      return "Minimal promotion; focus on awareness without a full campaign push.";
    case "custom":
      return "Follow the volunteer's custom plan while staying school-appropriate.";
    default:
      return "Support a full campaign arc with consistent messaging.";
  }
}

export function resolveCommunicationIntent(input: {
  stageId: CampaignStageId;
  channel: CommunicationChannel;
  communicationStrategy: CommunicationStrategy;
}): CommunicationIntent {
  const base = STAGE_INTENTS[input.stageId];
  const channelAngle =
    CHANNEL_ANGLES[input.channel] ??
    "Clear, school-appropriate copy for this channel.";

  return {
    ...base,
    messagingAngle: `${channelAngle} ${strategyAngle(input.communicationStrategy)}`,
  };
}
