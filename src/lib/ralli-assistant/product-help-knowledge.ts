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
}

/**
 * Curated in-app guide for Ask Ralli AI.
 * Keep answers short, navigation-first, and tied to real product routes.
 */
export const PRODUCT_HELP_TOPICS: ProductHelpTopic[] = [
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
    answer: [
      "Open Campaigns in the left nav, then click Create Campaign (or go to /events/create).",
      "Add the event name, date, and choose a playbook so milestones are ready.",
      "After you create it, open Create with AI on that campaign to generate artwork and captions for each milestone.",
    ].join(" "),
    links: [
      { label: "Create Campaign", href: "/events/create" },
      { label: "Campaigns", href: "/events" },
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
    answer: [
      "Open Approvals in the left nav (/approvals).",
      "You’ll see items waiting for you, other pending reviews, approved work, and anything with changes requested.",
      "You can also jump into Approvals from a campaign’s planning overview.",
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
    answer: [
      "After approval, the content is ready for publishing or scheduling.",
      "Auto-publish milestones can move into the publish/schedule flow; manual-upload items get handoff instructions (and email when due).",
      "Track status in Approvals (Approved) and in Calendar / Communications Hub for what’s going out.",
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
      "milestones",
      "inspiration step",
    ],
    answer: [
      "Create with AI is the guided campaign builder for one event.",
      "Work through Inspiration → Milestones → Preview → Review → Published.",
      "Generate artwork and captions per milestone, then send them through approvals.",
      "Open it from a campaign’s Create with AI entry (Campaigns → your event).",
    ].join(" "),
    links: [{ label: "Campaigns", href: "/events" }],
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
      "Communications Hub is in the left nav (/communications).",
      "Use it for inbox threads and social drafts tied to your campaigns.",
    ].join(" "),
    links: [{ label: "Communications Hub", href: "/communications" }],
  },
  {
    id: "find-volunteers",
    title: "Where do I find volunteers?",
    keywords: [
      "find volunteers",
      "volunteers tab",
      "signupgenius",
      "sign up genius",
      "volunteer shifts",
    ],
    answer: [
      "Open a campaign → Volunteers tab to connect SignUpGenius and review open shifts.",
      "Ask Ralli can also summarize volunteer coverage when SignUpGenius is connected (“Do I need more volunteers?”).",
    ].join(" "),
    links: [{ label: "Campaigns", href: "/events" }],
  },
  {
    id: "calendar",
    title: "How do I use the calendar?",
    keywords: ["calendar", "schedule", "when posting", "workload"],
    answer: [
      "Open Calendar in the left nav to see campaign communications across the school year.",
      "Click an item to review details, timing, and jump back into the related campaign work.",
    ].join(" "),
    links: [{ label: "Open Calendar", href: "/calendar" }],
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
      "Ask Ralli AI is your in-app guide — how to navigate Hey Ralli, create campaigns, find approvals, and understand workflows.",
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
      "Open Tasks in the left nav (/tasks) for campaign work across events.",
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
  const linkLines =
    topic.links.length > 0
      ? `\n\nQuick links:\n${topic.links
          .map((link) => `• ${link.label}: ${link.href}`)
          .join("\n")}`
      : "";
  return `${topic.answer}${linkLines}`;
}

export function buildProductHelpSystemPrompt(pathname?: string | null): string {
  const topicGuide = PRODUCT_HELP_TOPICS.map(
    (topic) =>
      `### ${topic.title}\n${topic.answer}\nLinks: ${topic.links
        .map((l) => `${l.label} (${l.href})`)
        .join("; ")}`,
  ).join("\n\n");

  return [
    "You are Ask Ralli AI — the in-app product guide for Hey Ralli (CampaignOS).",
    "Help school PTO users navigate the product: campaigns, Create with AI, approvals, calendar, communications, tasks, and settings.",
    "You are NOT the AI Brain content generator. Do not draft social posts, captions, or artwork prompts unless the user explicitly asks how those features work.",
    "If they ask about brand voice training, point them to Settings → AI Brain (/settings/ai-brain).",
    "Do NOT invent that you cannot summarize today/this week. For operational asks (today’s summary, what’s next for an event, what do I have this week), tell them to rephrase as “Give me today’s summary” or “What’s next for [event name]?” so the ops coach can answer from live campaign data.",
    "Answer in 2–5 short sentences. Be concrete. Prefer real nav labels and paths.",
    "When relevant, include one or two markdown-style path references like /approvals.",
    "If you are unsure, say what you know and suggest the closest nav area — never invent screens that do not exist.",
    pathname ? `The user is currently on: ${pathname}` : null,
    "",
    "PRODUCT GUIDE:",
    topicGuide,
  ]
    .filter(Boolean)
    .join("\n");
}
