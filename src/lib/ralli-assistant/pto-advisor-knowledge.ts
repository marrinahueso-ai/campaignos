/**
 * PTO playbook advice for Ask Ralli — experienced-president tips.
 * Not product navigation (that stays in product-help-knowledge).
 */

import { PTO_ADVISOR_EXTRA_TOPICS } from "@/lib/ralli-assistant/pto-advisor-extra-topics";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export interface PtoAdvisorTopic {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  links: ProductHelpLink[];
}

const VOLUNTEERS_LINK: ProductHelpLink = {
  label: "Volunteers",
  href: "/volunteers",
};
const CAMPAIGNS_LINK: ProductHelpLink = {
  label: "Campaigns",
  href: "/events",
};
const COMMS_LINK: ProductHelpLink = {
  label: "Communications Hub",
  href: "/communications",
};
const CREATE_LINK: ProductHelpLink = {
  label: "Create Campaign",
  href: "/events/create",
};

export const PTO_ADVISOR_TOPICS: PtoAdvisorTopic[] = [
  {
    id: "get-more-volunteers",
    title: "How do I get more volunteers?",
    keywords: [
      "get more volunteers",
      "more volunteers",
      "recruit volunteers",
      "need volunteers",
      "fill volunteer",
      "volunteer recruitment",
      "how to get volunteers",
    ],
    answer: [
      "Start recruiting earlier than you think. Send your first signup about 3–4 weeks before the event, then follow up weekly.",
      "Make each volunteer job sound specific and manageable, and remind families why their help matters.",
      "Short shifts usually fill faster than long ones.",
    ].join(" "),
    links: [VOLUNTEERS_LINK, CAMPAIGNS_LINK],
  },
  {
    id: "when-to-promote",
    title: "When should I start promoting my event?",
    keywords: [
      "when should i start promoting",
      "when to promote",
      "start promoting",
      "promotion timeline",
      "when to advertise",
      "communication timeline",
      "build my communication timeline",
      "comms timeline",
    ],
    answer: [
      "A good rule of thumb:",
      "4 weeks before: Save the Date.",
      "3 weeks before: Volunteer recruitment.",
      "2 weeks before: Event details.",
      "1 week before: Reminder.",
      "2 days before: Final reminder.",
      "Day of: Excitement and updates.",
    ].join(" "),
    links: [COMMS_LINK, CAMPAIGNS_LINK],
  },
  {
    id: "event-forgetting-checklist",
    title: "What am I forgetting for this event?",
    keywords: [
      "what am i forgetting",
      "am i forgetting",
      "forgetting for this event",
      "event checklist",
      "what else do i need",
    ],
    answer: [
      "Most events need:",
      "Volunteers, supplies, communications, principal approval, budget, vendors, a cleanup plan, and a rain plan if outdoors.",
      "If you have a campaign open, also ask “What’s next for [event name]?” so I can check what’s still incomplete in Hey Ralli.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, VOLUNTEERS_LINK],
  },
  {
    id: "overlooked-items",
    title: "What usually gets overlooked?",
    keywords: [
      "usually gets overlooked",
      "commonly forgotten",
      "overlooked",
      "forget to bring",
      "what do people forget",
    ],
    answer: [
      "Commonly forgotten items include:",
      "Extension cords, trash bags, volunteer check-in, name tags, directional signs, extra tape, first aid supplies, and water for volunteers.",
    ].join(" "),
    links: [CAMPAIGNS_LINK],
  },
  {
    id: "why-volunteers-not-signing",
    title: "Why aren't volunteers signing up?",
    keywords: [
      "why aren't volunteers",
      "why arent volunteers",
      "volunteers not signing",
      "no one is signing up",
      "nobody volunteering",
      "volunteer signups low",
    ],
    answer: [
      "Families often volunteer when:",
      "They know exactly what they'll be doing.",
      "Shifts are under an hour.",
      "They receive multiple reminders.",
      "The request explains why help is needed.",
      "Friends are volunteering too.",
      "Personal invitations fill spots much faster than general announcements.",
    ].join(" "),
    links: [VOLUNTEERS_LINK],
  },
  {
    id: "volunteer-fill-pace",
    title: "How full should my volunteer list be by now?",
    keywords: [
      "how full should",
      "volunteer list be",
      "volunteer fill",
      "volunteer pace",
      "am i behind on volunteers",
      "volunteer percentage",
    ],
    answer: [
      "As a general guideline:",
      "Under 25% several weeks out → behind pace.",
      "Around 50% two weeks before → healthy.",
      "Around 75% one week before → strong.",
      "90%+ a few days before → excellent.",
      "If your signup tool is connected, compare your real fill rate to this guide and send a personal ask to close the gap.",
    ].join(" "),
    links: [VOLUNTEERS_LINK],
  },
  {
    id: "ask-parents-individually",
    title: "Should I ask parents individually?",
    keywords: [
      "ask parents individually",
      "personal invitation",
      "ask individually",
      "dm parents",
      "text parents to volunteer",
    ],
    answer:
      "Yes. Personal invitations fill volunteer spots much faster than general announcements.",
    links: [VOLUNTEERS_LINK],
  },
  {
    id: "how-many-emails",
    title: "How many emails is too many?",
    keywords: [
      "how many emails",
      "too many emails",
      "email too often",
      "over email",
      "email frequency",
    ],
    answer:
      "Families usually prefer fewer, more helpful emails. Combine announcements when possible and send reminders only when they add new information.",
    links: [COMMS_LINK],
  },
  {
    id: "post-on-facebook",
    title: "Should I post this on Facebook?",
    keywords: [
      "post this on facebook",
      "should i post",
      "post on social",
      "facebook or email",
      "post on instagram too",
    ],
    answer:
      "If the information is important to families, it's usually worth posting on both email and social media. Different families check different platforms.",
    links: [COMMS_LINK],
  },
  {
    id: "announcement-contents",
    title: "What should I include in this announcement?",
    keywords: [
      "include in this announcement",
      "what should i include",
      "announcement should include",
      "what to put in the email",
      "flyer should include",
    ],
    answer: [
      "Include:",
      "What, When, Where, Who, Cost (if applicable), a clear call to action, and any deadline.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "how-much-charge",
    title: "How much should we charge?",
    keywords: [
      "how much should we charge",
      "how much to charge",
      "ticket price",
      "what to charge",
      "pricing for the event",
    ],
    answer:
      "Look at similar schools, estimate your costs, and set a price that helps you reach your fundraising goal while remaining affordable for families.",
    links: [CAMPAIGNS_LINK],
  },
  {
    id: "raise-more-money",
    title: "How can we raise more money?",
    keywords: [
      "raise more money",
      "fundraising ideas",
      "raise funds",
      "make more money",
      "fundraise better",
    ],
    answer: [
      "Ideas include:",
      "Sponsorships, silent auctions, spirit wear, restaurant nights, direct donations, family events, and corporate matching.",
    ].join(" "),
    links: [CAMPAIGNS_LINK],
  },
  {
    id: "events-per-semester",
    title: "How many events should we have each semester?",
    keywords: [
      "how many events",
      "events each semester",
      "events per semester",
      "too many events",
      "how many fundraisers",
    ],
    answer:
      "Quality is usually more important than quantity. Many successful PTOs focus on a handful of well-organized events instead of trying to fill every month.",
    links: [CAMPAIGNS_LINK, CREATE_LINK],
  },
  {
    id: "best-time-emails",
    title: "When is the best time to send emails?",
    keywords: [
      "best time to send emails",
      "when to send emails",
      "best time to email",
      "when should i send",
    ],
    answer:
      "Many school organizations see good engagement on weekday mornings or early evenings, but every community is different. Review your engagement data when you have it, and stay consistent.",
    links: [COMMS_LINK],
  },
  {
    id: "should-create-flyer",
    title: "Should I create a flyer?",
    keywords: [
      "should i create a flyer",
      "do i need a flyer",
      "make a flyer",
      "need a graphic",
    ],
    answer:
      "If the announcement includes dates, deadlines, or registration details, a flyer or graphic can improve visibility—especially on social media. Create with AI can help generate artwork once the campaign exists.",
    links: [CAMPAIGNS_LINK, COMMS_LINK],
  },
  {
    id: "can-you-create",
    title: "Can you create this for me?",
    keywords: [
      "can you create this",
      "can you make this",
      "create this for me",
      "generate this for me",
      "can you help me create",
    ],
    answer: [
      "Absolutely. Tell me what you're planning, and I can help with announcements, social posts, flyers, newsletters, volunteer requests, and timelines.",
      "Try “Write tomorrow’s reminder” or open Create with AI on your campaign for artwork and captions.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, COMMS_LINK],
  },
  ...PTO_ADVISOR_EXTRA_TOPICS,
];

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[^\p{L}\p{N}\s?/'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchPtoAdvisorTopic(question: string): PtoAdvisorTopic | null {
  const normalized = normalizeQuestion(question);
  if (!normalized) return null;

  let best: { topic: PtoAdvisorTopic; score: number } | null = null;

  for (const topic of PTO_ADVISOR_TOPICS) {
    let score = 0;
    for (const keyword of topic.keywords) {
      if (normalized.includes(keyword)) {
        score += keyword.split(" ").length;
      }
    }
    if (normalized === normalizeQuestion(topic.title)) {
      score += 10;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { topic, score };
    }
  }

  return best?.topic ?? null;
}

export function formatPtoAdvisorAnswer(topic: PtoAdvisorTopic): string {
  return topic.answer;
}

export function shouldPreferPtoAdvisor(question: string): boolean {
  return matchPtoAdvisorTopic(question) != null;
}
