export interface ProductHelpLink {
  label: string;
  href: string;
}

export interface ProductHelpTopic {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  links: ProductHelpLink[];
  /** Help Center article id (`/help#{id}`) when a matching how-to exists. */
  helpArticleId?: string;
}

export const HELP_CENTER_HOME_LINK: ProductHelpLink = {
  label: "Help Center",
  href: "/help",
};

export function helpCenterArticleLink(articleId: string): ProductHelpLink {
  const id = articleId.trim().replace(/^#/, "");
  return {
    label: "Help Center",
    href: id ? `/help#${id}` : "/help",
  };
}

/** Append Help Center (article when known) without duplicating /help chips. */
export function withHelpCenterLink(
  links: ProductHelpLink[],
  articleId?: string | null,
): ProductHelpLink[] {
  const help = articleId?.trim()
    ? helpCenterArticleLink(articleId)
    : HELP_CENTER_HOME_LINK;
  const withoutHelp = links.filter((link) => !link.href.startsWith("/help"));
  return [...withoutHelp, help];
}

/**
 * Curated in-app guide for Ask Ralli AI.
 * Keep answers short, navigation-first, and tied to real product routes.
 */
export const PRODUCT_HELP_TOPICS: ProductHelpTopic[] = [
  {
    id: "getting-started",
    title: "I'm new. Where do I start?",
    keywords: [
      "getting started",
      "where do i start",
      "i'm new",
      "im new",
      "new to hey ralli",
      "first time setup",
      "onboarding",
    ],
    helpArticleId: "getting-started",
    answer: [
      "Create your first event, then finish Essentials (calendar + brand) and Connect (team + Meta).",
      "After that, use Create with AI for social posts, send them through Approvals, and schedule or publish when ready.",
      "For the full walkthrough, open the Help Center article linked below.",
    ].join(" "),
    links: [
      { label: "Create event", href: "/events/create" },
      { label: "Calendar", href: "/calendar" },
      { label: "Team & Access", href: "/settings/team-access" },
    ],
  },
  {
    id: "invite-team",
    title: "How do I invite my team?",
    keywords: [
      "invite team",
      "invite my team",
      "add team",
      "team access",
      "invite board",
      "add member",
      "invite people",
    ],
    helpArticleId: "invite-team",
    answer: [
      "Open Settings (gear in the top bar) → Team & Access.",
      "Invite by email, choose an access template, and resend if needed.",
      "People who already use Hey Ralli at another school can join yours with the same email.",
    ].join(" "),
    links: [{ label: "Team & Access", href: "/settings/team-access" }],
  },
  {
    id: "connect-meta",
    title: "How do I connect Facebook and Instagram?",
    keywords: [
      "connect facebook",
      "connect instagram",
      "facebook and instagram",
      "connect meta",
      "link facebook",
      "link instagram",
      "meta connect",
      "social media connect",
      "connect social",
    ],
    helpArticleId: "connect-meta",
    answer: [
      "Open Settings (gear in the top bar) → Integrations, or finish Connect during onboarding.",
      "You’ll need access to the Facebook Page (and Instagram if you use it).",
      "If connect isn’t available yet for your school, contact support — Meta access rolls out as App Review completes.",
    ].join(" "),
    links: [
      { label: "Integrations", href: "/settings/integrations" },
      { label: "Onboarding connect", href: "/onboarding/connect" },
    ],
  },
  {
    id: "create-campaign",
    title: "How do I create a campaign?",
    keywords: [
      "create campaign",
      "create a campaign",
      "new campaign",
      "new event",
      "create event",
      "start campaign",
      "make a campaign",
    ],
    helpArticleId: "getting-started",
    answer: [
      "Open Events in the left nav, then Create event.",
      "Add the event name, date, and details so posts and flyers have a home.",
      "After you create it, open Create with AI on that event to generate artwork and captions.",
    ].join(" "),
    links: [
      { label: "Create event", href: "/events/create" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    id: "find-approvals",
    title: "Where do I find my approvals?",
    keywords: [
      "approvals",
      "find approvals",
      "where approvals",
      "pending approval",
      "needs approval",
      "approve",
      "review content",
    ],
    helpArticleId: "approvals",
    answer: [
      "Open Approvals in the left nav.",
      "You’ll see items waiting for you, changes requested, scheduled, posted, and failed (with Retry when Meta publish fails).",
      "Approvers use Open full view to approve or request changes.",
    ].join(" "),
    links: [{ label: "Open Approvals", href: "/approvals" }],
  },
  {
    id: "after-approval",
    title: "What happens after something is approved?",
    keywords: [
      "after approval",
      "after approved",
      "once approved",
      "what happens after",
      "approved then",
      "publish after approve",
      "scheduled after",
    ],
    helpArticleId: "approvals",
    answer: [
      "After approval, the content is ready for publishing or scheduling.",
      "Auto-publish posts can move into the publish/schedule flow; manual-upload items get handoff instructions (and email when due).",
      "Track status in Approvals and in Calendar / Communications Hub for what’s going out.",
    ].join(" "),
    links: [
      { label: "Approvals", href: "/approvals" },
      { label: "Calendar", href: "/calendar" },
      { label: "Communications Hub", href: "/communications" },
    ],
  },
  {
    id: "create-with-ai",
    title: "What is Create with AI?",
    keywords: [
      "create with ai",
      "campaign builder",
      "generate artwork",
      "generate captions",
      "social posts with ai",
      "create social posts",
      // Avoid bare "milestones" — status asks (“are my milestones done?”) are ops/org.
      "posts step",
      "create with ai posts",
      "inspiration step",
    ],
    helpArticleId: "create-with-ai",
    answer: [
      "Create with AI builds social posts (and related surfaces) for one event.",
      "Open Create with AI → Social, or start from an event’s Create with AI tab.",
      "Work through Creative Setup → posts → preview → review, then send for approval.",
    ].join(" "),
    links: [
      { label: "Create with AI", href: "/create-with-ai" },
      { label: "Social", href: "/create-with-ai/social" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    id: "communications-hub",
    title: "Where is the Communications Hub?",
    keywords: [
      "communications hub",
      "inbox",
      "social media center",
      "drafts",
      "messages",
    ],
    answer: [
      "Communications Hub is in the left nav.",
      "Use it for inbox threads and social drafts tied to your campaigns.",
    ].join(" "),
    links: [{ label: "Communications Hub", href: "/communications" }],
  },
  {
    id: "find-volunteers",
    title: "Where do I find volunteers?",
    keywords: [
      "find volunteers",
      "where do volunteers",
      "volunteers tab",
      "signupgenius",
      "sign up genius",
      "volunteer shifts",
      "volunteers live",
    ],
    helpArticleId: "volunteers",
    answer: [
      "Open Volunteers in the left nav for your volunteer master view.",
      "On an event, use the Volunteers tab to connect a SignUpGenius URL and track coverage.",
    ].join(" "),
    links: [
      { label: "Volunteers", href: "/volunteers" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    id: "calendar",
    title: "How do I use the calendar?",
    keywords: [
      "calendar",
      "schedule",
      "when posting",
      "workload",
      "bring in our school calendar",
      "import calendar",
      "school calendar",
    ],
    helpArticleId: "calendar",
    answer: [
      "Open Calendar in the left nav to see campaign communications across the school year.",
      "Use Bring in calendar / Import to upload a file or connect Google, then review items before they become events.",
      "You can also drag scheduled Meta posts on the calendar when you’re ready to adjust timing.",
    ].join(" "),
    links: [
      { label: "Open Calendar", href: "/calendar" },
      { label: "Import", href: "/calendar/import" },
    ],
  },
  {
    id: "billing-credits",
    title: "How do plans and AI credits work?",
    keywords: [
      "billing",
      "ai credits",
      "plans and ai",
      "upgrade plan",
      "out of credits",
      "reserve credits",
      "subscription",
    ],
    helpArticleId: "billing-credits",
    answer: [
      "Open Settings (gear) → Billing to see usage, plans, and payment.",
      "Monthly AI credits reset each period; AI Reserve rolls over if you buy more.",
      "If generation is blocked, check that you still have credits or Reserve, or upgrade your plan.",
    ].join(" "),
    links: [{ label: "Billing", href: "/settings/billing-plan" }],
  },
  {
    id: "ai-brain-vs-ask",
    title: "What’s the difference between Ask and AI Brain?",
    keywords: [
      "ai brain",
      "difference",
      "settings ai",
      "training library",
      "brand voice settings",
      "ask vs",
    ],
    answer: [
      "Ask Ralli is your in-app guide — how to navigate Hey Ralli, create campaigns, find approvals, and understand workflows.",
      "AI Brain (Settings → AI Brain) is where you train brand voice, logos, and source material used when generating content.",
      "Use Ask for “how do I…?” Use AI Brain for “how should our content sound?”",
    ].join(" "),
    links: [{ label: "AI Brain settings", href: "/settings/ai-brain" }],
  },
  {
    id: "tasks",
    title: "Where are my tasks?",
    // Avoid bare "to do" — it false-matches “what … need to do” ops questions.
    keywords: ["tasks", "todo", "to-do", "checklist", "my tasks", "my to do"],
    answer: [
      "Open Tasks in the left nav for campaign work across events.",
      "Individual campaign workspaces also have planning tasks for that event.",
    ].join(" "),
    links: [{ label: "Open Tasks", href: "/tasks" }],
  },
];

export const PRODUCT_HELP_SUGGESTIONS = PRODUCT_HELP_TOPICS.slice(0, 4).map(
  (topic) => topic.title,
);

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[^\p{L}\p{N}\s?/'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchProductHelpTopic(
  question: string,
): ProductHelpTopic | null {
  const normalized = normalizeQuestion(question);
  if (!normalized) {
    return null;
  }

  let best: { topic: ProductHelpTopic; score: number } | null = null;

  for (const topic of PRODUCT_HELP_TOPICS) {
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

export function formatTopicAnswer(topic: ProductHelpTopic): string {
  // Destinations render as chips in the widget — keep the body prose-only.
  return topic.answer;
}

export function buildProductHelpSystemPrompt(pathname?: string | null): string {
  const topicGuide = PRODUCT_HELP_TOPICS.map(
    (topic) =>
      `### ${topic.title}\n${topic.answer}\nLinks: ${topic.links
        .map((l) => `${l.label} (${l.href})`)
        .join("; ")}`,
  ).join("\n\n");

  return [
    "You are Ask Ralli — a friendly product guide for Hey Ralli (CampaignOS), with the calm practical tone of an experienced PTO president.",
    "Help school PTO users navigate the product: campaigns, Create with AI, approvals, calendar, communications, tasks, and settings.",
    "You are NOT the AI Brain content generator. Do not draft social posts, captions, or artwork prompts unless the user explicitly asks how those features work.",
    "Settings is the gear icon in the top bar (not the left nav). Integrations, Team & Access, Billing, and AI Brain live under Settings.",
    "If they ask about brand voice training, point them to Settings → AI Brain (/settings/ai-brain).",
    "For how-to questions, mention that a Help Center article is available (chips include Help Center) and name the real destination (Integrations, Approvals, etc.).",
    "Do NOT invent that you cannot summarize today/this week. For operational asks (today’s summary, what’s next for an event, what do I have this week), point them to the suggested chips or say they can ask “today’s summary” / “what’s next for [event name]?” — never demand an exact canned phrase.",
    "Answer in 2–5 short sentences. Be concrete. Prefer real nav labels.",
    "Do NOT write markdown links like [Approvals](/approvals). Name areas plainly (Approvals, Events) — chips show destinations separately including Help Center.",
    "If you are unsure, say what you know and suggest the closest nav area plus Help Center — never invent screens that do not exist.",
    pathname ? `The user is currently on: ${pathname}` : null,
    "",
    "PRODUCT GUIDE:",
    topicGuide,
  ]
    .filter(Boolean)
    .join("\n");
}
