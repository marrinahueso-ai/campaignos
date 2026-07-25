/**
 * Extra PTO / ops-partner playbook topics from the Ask Ralli training corpus.
 * Live org facts stay on org/ops/insights routes — these are advice-only.
 */

import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export type ExtraPtoAdvisorTopic = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  links: ProductHelpLink[];
};

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
const APPROVALS_LINK: ProductHelpLink = {
  label: "Approvals",
  href: "/approvals",
};
const TEAM_LINK: ProductHelpLink = {
  label: "Team access",
  href: "/settings/team-access",
};
const BRAND_LINK: ProductHelpLink = {
  label: "Organization branding",
  href: "/settings/organization/edit",
};
const CALENDAR_LINK: ProductHelpLink = {
  label: "Calendar",
  href: "/calendar",
};
const INSIGHTS_LINK: ProductHelpLink = {
  label: "Insights",
  href: "/insights",
};
const ONBOARDING_LINK: ProductHelpLink = {
  label: "Onboarding",
  href: "/onboarding",
};

export const PTO_ADVISOR_EXTRA_TOPICS: ExtraPtoAdvisorTopic[] = [
  {
    id: "im-new-where-start",
    title: "I'm new. Where do I start?",
    keywords: [
      "i'm new",
      "im new",
      "where do i start",
      "where should i start",
      "getting started",
      "new here",
      "just getting started",
    ],
    answer: [
      "Start by creating your organization profile, adding your branding, connecting your calendar, and creating your first event.",
      "Once your event is set up, I can help you build communications, recruit volunteers, and keep everything on schedule.",
      "Ask “What should I set up first?” anytime for a short checklist.",
    ].join(" "),
    links: [ONBOARDING_LINK, BRAND_LINK, CREATE_LINK, CALENDAR_LINK],
  },
  {
    id: "walk-me-through",
    title: "Can you walk me through this?",
    keywords: [
      "walk me through",
      "guide me through",
      "step by step",
      "one step at a time",
      "hold my hand",
    ],
    answer: [
      "Absolutely. I'll guide you one step at a time and explain what each section is for so you never feel overwhelmed.",
      "Tell me what you're looking at (campaign, approvals, volunteers, or communications), or ask “What should I set up first?”",
    ].join(" "),
    links: [ONBOARDING_LINK, CAMPAIGNS_LINK],
  },
  {
    id: "set-up-first",
    title: "What should I set up first?",
    keywords: [
      "what should i set up first",
      "set up first",
      "setup first",
      "first things to set up",
      "what to configure first",
    ],
    answer: [
      "I recommend setting up your organization, adding your team members, connecting your calendar, and creating your first event before moving into communications.",
      "Then open Create with AI on that campaign for artwork and captions, and connect Volunteers when you're ready to recruit.",
    ].join(" "),
    links: [ONBOARDING_LINK, TEAM_LINK, CALENDAR_LINK, CREATE_LINK],
  },
  {
    id: "account-set-up",
    title: "Is my account completely set up?",
    keywords: [
      "is my account completely set up",
      "is my account set up",
      "account completely set up",
      "did i finish setup",
      "am i fully set up",
    ],
    answer: [
      "I can't auto-audit every connection yet, but a complete setup usually includes: organization profile + branding, at least one team invite, calendar connected, and your first campaign created.",
      "Ask “What needs my attention today?” for live priorities, or open Organization and Integrations to fill gaps.",
    ].join(" "),
    links: [BRAND_LINK, TEAM_LINK, CALENDAR_LINK, CREATE_LINK],
  },
  {
    id: "too-early-volunteers",
    title: "Is it too early to ask for volunteers?",
    keywords: [
      "too early to ask for volunteers",
      "too early for volunteers",
      "early to ask for volunteers",
      "start asking for volunteers",
    ],
    answer:
      "Usually no. Starting early gives families more opportunities to commit and helps avoid last-minute recruiting. Aim for about 3–4 weeks out for the first signup ask, then follow up weekly.",
    links: [VOLUNTEERS_LINK],
  },
  {
    id: "jobs-fill-first",
    title: "Which volunteer jobs usually fill first?",
    keywords: [
      "jobs usually fill first",
      "volunteer jobs fill first",
      "which jobs fill first",
      "fill the fastest",
      "easiest volunteer jobs",
    ],
    answer:
      "Short, clearly defined shifts with simple responsibilities usually fill the fastest.",
    links: [VOLUNTEERS_LINK],
  },
  {
    id: "jobs-hardest-fill",
    title: "Which jobs are hardest to fill?",
    keywords: [
      "hardest to fill",
      "jobs are hardest",
      "hardest volunteer jobs",
      "difficult to fill",
      "which jobs are hardest",
    ],
    answer:
      "Cleanup, setup, leadership roles, and longer shifts often take the most recruiting. Split long shifts and send personal asks for chairs and leads.",
    links: [VOLUNTEERS_LINK],
  },
  {
    id: "who-ask-first",
    title: "Who should I ask first?",
    keywords: [
      "who should i ask first",
      "ask first for volunteers",
      "who to ask first",
      "who do i ask first",
    ],
    answer:
      "Start with committee members, experienced volunteers, and parents who have helped before. Personal invitations fill spots much faster than general announcements.",
    links: [VOLUNTEERS_LINK, TEAM_LINK],
  },
  {
    id: "split-shift",
    title: "Should I split this shift?",
    keywords: [
      "should i split this shift",
      "split this shift",
      "split the shift",
      "break up the shift",
      "shorter shifts",
    ],
    answer:
      "If it's longer than an hour or two, splitting it often makes it easier to fill.",
    links: [VOLUNTEERS_LINK],
  },
  {
    id: "write-everything",
    title: "Can you write everything for me?",
    keywords: [
      "write everything for me",
      "can you write everything",
      "create everything for me",
      "do all the writing",
    ],
    answer: [
      "Yes. I can help create emails, newsletters, flyers, captions, announcements, volunteer requests, reminders, and more.",
      "Try “Write tomorrow’s reminder,” paste a draft and ask me to rewrite it, or open Create with AI on your campaign for artwork and captions.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, COMMS_LINK],
  },
  {
    id: "make-social-posts",
    title: "Can you make this into social posts?",
    keywords: [
      "make this into social",
      "into social posts",
      "turn this into social",
      "convert to social posts",
      "make social posts",
    ],
    answer: [
      "Absolutely. Paste the announcement (in quotes) and ask me to rewrite it for Facebook or Instagram,",
      "or open Create with AI on the campaign for captions tied to each milestone.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, COMMS_LINK],
  },
  {
    id: "turn-into-newsletter",
    title: "Can you turn this into a newsletter?",
    keywords: [
      "turn this into a newsletter",
      "into a newsletter",
      "make a newsletter",
      "write a newsletter",
    ],
    answer: [
      "Yes. Paste your bullet points or announcement (in quotes) and ask me to organize it into a polished newsletter-ready draft.",
      "Keep What / When / Where / Who / Cost / CTA, then send from Communications Hub when you're ready.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "make-flyer",
    title: "Can you make a flyer?",
    keywords: [
      "can you make a flyer",
      "make a flyer",
      "create a flyer",
      "flyer copy",
      "write a flyer",
    ],
    answer: [
      "I can draft flyer copy that highlights What, When, Where, Who, Cost, and a clear call to action.",
      "For artwork, open Create with AI on your campaign. Paste draft text here if you want a rewrite.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, COMMS_LINK],
  },
  {
    id: "instagram-caption",
    title: "Can you make an Instagram caption?",
    keywords: [
      "instagram caption",
      "make an instagram caption",
      "write an instagram caption",
      "ig caption",
    ],
    answer: [
      "Yes. Name the event (or open its page) and ask for an Instagram caption, or paste draft text to rewrite.",
      "I keep captions concise, engaging, and family-friendly — nothing is published until you approve.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, COMMS_LINK],
  },
  {
    id: "can-you-rewrite",
    title: "Can you rewrite this?",
    keywords: [
      "can you rewrite this",
      "rewrite this",
      "please rewrite",
      "rewrite for me",
    ],
    answer: [
      "Of course. Paste the draft in quotes and tell me the tone you want — warmer, shorter, more exciting, or more welcoming.",
      "Example: Rewrite this to sound more welcoming: “…”",
    ].join(" "),
    links: [COMMS_LINK, CAMPAIGNS_LINK],
  },
  {
    id: "subject-line",
    title: "What subject line should I use?",
    keywords: [
      "what subject line",
      "subject line should i use",
      "email subject line",
      "suggest a subject line",
      "subject lines",
    ],
    answer: [
      "Strong school-family subject lines are short, specific, and deadline-aware.",
      "Try: “[Event] — save the date,” “Volunteers needed for [Event] (short shifts),” or “Reminder: [Event] is [day].”",
      "Paste your email body and I can suggest 3 tailored options.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "too-formal",
    title: "Does this email sound too formal?",
    keywords: [
      "too formal",
      "sound too formal",
      "less formal",
      "too stuffy",
    ],
    answer: [
      "Families usually respond better to warm, plain language than formal board-speak.",
      "Paste the email in quotes and ask me to make it friendlier — I'll keep the facts and soften the tone.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "is-confusing",
    title: "Is this confusing?",
    keywords: [
      "is this confusing",
      "does this make sense",
      "too confusing",
      "clear enough",
    ],
    answer: [
      "From a parent's perspective, unclear date/time, missing location, or a buried call to action are the usual confusion traps.",
      "Paste the draft in quotes and I'll flag anything unclear and suggest a clearer version.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "more-welcoming",
    title: "Can you make this sound more welcoming?",
    keywords: [
      "more welcoming",
      "sound more welcoming",
      "friendlier",
      "more inviting tone",
      "warmer tone",
    ],
    answer: [
      "Absolutely. Paste the text in quotes and ask me to make it more welcoming — I'll adjust the tone so families feel invited rather than instructed.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "skip-approvals",
    title: "Can I skip approvals?",
    keywords: [
      "can i skip approvals",
      "skip approvals",
      "bypass approval",
      "skip the approval",
    ],
    answer: [
      "Only if your permissions allow publishing without review. Many schools require approval before posts go live.",
      "Open Approvals to see what's waiting, or ask an admin about your team's approval settings.",
    ].join(" "),
    links: [APPROVALS_LINK, TEAM_LINK],
  },
  {
    id: "can-remove-someone",
    title: "Can I remove someone?",
    keywords: [
      "can i remove someone",
      "remove someone",
      "remove access",
      "remove a member",
      "revoke access",
    ],
    answer: [
      "Yes — if you have admin permissions, open Team access, find the person, and remove or adjust their access.",
      "I can't remove people for you from this chat, but I can point you there.",
    ].join(" "),
    links: [TEAM_LINK],
  },
  {
    id: "too-close-events",
    title: "Is this too close to another event?",
    keywords: [
      "too close to another event",
      "too close to another",
      "events too close",
      "back to back events",
      "events conflict",
    ],
    answer: [
      "When two family events land within a week, attendance and volunteer energy often drop.",
      "Check Calendar for nearby dates, leave breathing room for promotions, and ask “Do we have any conflicts?” for a live look at this week.",
    ].join(" "),
    links: [CALENDAR_LINK, CAMPAIGNS_LINK],
  },
  {
    id: "should-move-event",
    title: "Should we move this event?",
    keywords: [
      "should we move this event",
      "should we move the event",
      "reschedule this event",
      "change the event date",
    ],
    answer: [
      "Move it if there's a hard conflict (school holiday, big sports night, or another major fundraiser the same week).",
      "If it's only slightly crowded, keep the date and strengthen promotion + volunteer asks. Compare nearby dates on Calendar before deciding.",
    ].join(" "),
    links: [CALENDAR_LINK, CAMPAIGNS_LINK],
  },
  {
    id: "fundraising-goals",
    title: "Are we meeting our fundraising goals?",
    keywords: [
      "meeting our fundraising",
      "fundraising goals",
      "fundraising goal",
      "are we meeting our goal",
      "how close to our goal",
    ],
    answer: [
      "I can't see live fundraising totals in Hey Ralli yet.",
      "Compare your current proceeds to your target outside the app, then use Campaigns and Communications to push the next high-impact ask (sponsorships, ticket sales, or a reminder).",
    ].join(" "),
    links: [CAMPAIGNS_LINK, COMMS_LINK, INSIGHTS_LINK],
  },
  {
    id: "biggest-fundraiser",
    title: "What's our biggest fundraiser?",
    keywords: [
      "biggest fundraiser",
      "highest-performing fundraising",
      "which fundraiser made",
      "made the most money",
      "most successful fundraiser",
    ],
    answer: [
      "I don't have fundraising dollar totals in the app yet.",
      "Many PTOs find ticketed family nights, auctions, and spirit wear lead — compare your past proceeds, then ask “Which events need more volunteers?” to protect your next big earner.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, INSIGHTS_LINK],
  },
  {
    id: "donations-slowing",
    title: "Are donations slowing down?",
    keywords: [
      "donations slowing",
      "giving slowing",
      "donations taper",
      "fundraising slowing",
    ],
    answer: [
      "I can't chart donation velocity yet. If giving usually slows mid-campaign, send a short reminder with a clear “why it matters,” a simple CTA, and a deadline.",
      "Ask “What should I send this week?” for a live communications nudge.",
    ].join(" "),
    links: [COMMS_LINK, CAMPAIGNS_LINK],
  },
  {
    id: "why-isnt-working",
    title: "Why isn't this working?",
    keywords: [
      "why isn't this working",
      "why isnt this working",
      "not working",
      "why won't this work",
      "something's wrong",
    ],
    answer: [
      "Common blockers: missing event details, permissions, pending approvals, or an incomplete setup step.",
      "Ask “What's waiting for approval?,” “What's wrong with this event?,” or “What needs my attention today?” so I can check live status — or tell me which screen you're on.",
    ].join(" "),
    links: [APPROVALS_LINK, CAMPAIGNS_LINK, TEAM_LINK],
  },
  {
    id: "why-didnt-send",
    title: "Why didn't this send?",
    keywords: [
      "why didn't this send",
      "why didnt this send",
      "didn't send",
      "didnt send",
      "failed to send",
      "why wasn't this sent",
    ],
    answer: [
      "Usually it's delayed, not scheduled yet, waiting on approval, or blocked by a missing connection.",
      "Check Approvals and Communications Hub for status. Ask “What's waiting for approval?” if you want a live queue.",
    ].join(" "),
    links: [APPROVALS_LINK, COMMS_LINK, CALENDAR_LINK],
  },
  {
    id: "parents-understand",
    title: "Would parents understand this?",
    keywords: [
      "would parents understand",
      "parents understand this",
      "from a parent",
      "parent perspective",
      "too much jargon",
    ],
    answer: [
      "Parents skim. Lead with What / When / Where, put the ask in the first few lines, and avoid board jargon.",
      "Paste the draft in quotes and I'll simplify anything unclear.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "too-much-info",
    title: "Is this too much information?",
    keywords: [
      "too much information",
      "too much info",
      "information overload",
      "too long for parents",
    ],
    answer: [
      "If a parent can't find the date and the ask in a few seconds, it's too much for one message.",
      "Keep one primary CTA; save secondary details for a follow-up. Paste the draft and ask me to shorten it.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "would-you-click",
    title: "Would you click on this?",
    keywords: [
      "would you click",
      "would you open this",
      "compelling enough",
      "click on this",
    ],
    answer: [
      "I'd click when the subject/headline is specific, the image feels warm (not cluttered), and the call to action is obvious.",
      "Paste the subject + opening lines and I'll suggest a tighter hook.",
    ].join(" "),
    links: [COMMS_LINK],
  },
  {
    id: "would-you-volunteer",
    title: "Would you volunteer for this?",
    keywords: [
      "would you volunteer for this",
      "would you sign up for this",
      "invite to volunteer",
      "volunteer request inviting",
    ],
    answer: [
      "I'd say yes when the job is clear, the shift is short, and the ask explains why help matters.",
      "Paste your volunteer request and I'll make it easier to say yes.",
    ].join(" "),
    links: [VOLUNTEERS_LINK, COMMS_LINK],
  },
  {
    id: "is-good-idea",
    title: "Is this a good idea?",
    keywords: [
      "is this a good idea",
      "good idea",
      "should we do this",
      "worth doing",
    ],
    answer: [
      "A good PTO idea usually has a clear family benefit, a realistic volunteer plan, enough lead time to promote, and a simple success measure.",
      "Tell me the idea in one sentence (date + goal) and I'll weigh benefits, risks, and a simpler alternative if needed.",
    ].join(" "),
    links: [CAMPAIGNS_LINK, CALENDAR_LINK],
  },
  {
    id: "can-be-improved",
    title: "Can this be improved?",
    keywords: [
      "can this be improved",
      "how can this be improved",
      "improve this",
      "make this better",
    ],
    answer: [
      "Yes. Paste the draft or describe the plan, and I'll suggest practical improvements while keeping things simple.",
      "For live campaign gaps, ask “What's missing from this campaign?” or “What still needs to be finished?”",
    ].join(" "),
    links: [COMMS_LINK, CAMPAIGNS_LINK, INSIGHTS_LINK],
  },
  {
    id: "prepare-next-week",
    title: "What should I prepare before next week?",
    keywords: [
      "prepare before next week",
      "before next week",
      "get ready for next week",
      "prep for next week",
    ],
    answer: [
      "Look one week ahead: confirm volunteer coverage, queue the next email/social post, clear approvals, and check supplies/vendors for anything due soon.",
      "Ask “What's happening this week?” or “What should I send this week?” for a live briefing.",
    ].join(" "),
    links: [CALENDAR_LINK, COMMS_LINK, VOLUNTEERS_LINK],
  },
  {
    id: "problem-if-wait",
    title: "Is anything likely to become a problem if I wait?",
    keywords: [
      "problem if i wait",
      "if i wait",
      "become a problem",
      "risky to wait",
      "wait too long",
    ],
    answer: [
      "Waiting usually hurts volunteer fill rates and promotion lead time first — then approvals pile up close to publish day.",
      "Ask “What's falling behind?” or “What's my biggest risk?” for a live read.",
    ].join(" "),
    links: [APPROVALS_LINK, VOLUNTEERS_LINK, INSIGHTS_LINK],
  },
];
