export type HelpArticleLink = {
  label: string;
  href: string;
};

export type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  body: string[];
  links: HelpArticleLink[];
};

/** Curated Help Center articles — how-to first for early schools. */
export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "getting-started",
    title: "I’m new — where do I start?",
    summary: "First event, calendar, brand, team, then Meta.",
    body: [
      "Create your first event, then finish the optional Essentials step (calendar + brand) and Connect step (team + Meta).",
      "After that, use Create with AI for social posts, send them through Approvals, and schedule or publish when ready.",
    ],
    links: [
      { label: "Create event", href: "/events/create" },
      { label: "Calendar", href: "/calendar" },
      { label: "Team & Access", href: "/settings/team-access" },
    ],
  },
  {
    id: "invite-team",
    title: "How do I invite my team?",
    summary: "Add board members and set what they can do.",
    body: [
      "Open Settings → Team & Access.",
      "Invite by email, choose an access template (Owner, President, Chair, Viewer, and so on), and resend if needed.",
      "People who already use Hey Ralli at another school can join yours with the same email — they switch orgs in the header.",
    ],
    links: [{ label: "Team & Access", href: "/settings/team-access" }],
  },
  {
    id: "connect-meta",
    title: "How do I connect Facebook and Instagram?",
    summary: "Link your Page so you can approve and publish.",
    body: [
      "Open Settings → Integrations (or finish Connect during onboarding) and connect Meta.",
      "You’ll need access to the Facebook Page (and Instagram if you use it).",
      "If connect isn’t available yet for your school, contact support — Meta access rolls out as App Review completes.",
    ],
    links: [
      { label: "Integrations", href: "/settings/integrations" },
      { label: "Onboarding connect", href: "/onboarding/connect" },
    ],
  },
  {
    id: "create-with-ai",
    title: "How do I create social posts with AI?",
    summary: "Artwork and captions for one event.",
    body: [
      "Open Create with AI → Social, or open an event and start Create with AI from there.",
      "Work through Creative Setup → posts → preview → review, then send for approval.",
      "Only include facts you know — don’t invent times or logistics the AI suggests if they’re wrong.",
    ],
    links: [
      { label: "Create with AI", href: "/create-with-ai" },
      { label: "Social", href: "/create-with-ai/social" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    id: "approvals",
    title: "Where do approvals live?",
    summary: "Review, approve, request changes, or retry failed posts.",
    body: [
      "Open Approvals in the left nav.",
      "You’ll see items waiting for you, changes requested, scheduled, posted, and failed (with Retry when Meta publish fails).",
      "Approvers use Open full view to approve or request changes.",
    ],
    links: [{ label: "Approvals", href: "/approvals" }],
  },
  {
    id: "calendar",
    title: "How do I bring in our school calendar?",
    summary: "Import dates, then review before they become events.",
    body: [
      "Open Calendar → Bring in calendar (or Calendar import).",
      "Upload a file or connect Google, then review imported items before they land on your year.",
      "You can also drag scheduled Meta posts on the calendar when you’re ready to adjust timing.",
    ],
    links: [
      { label: "Calendar", href: "/calendar" },
      { label: "Import", href: "/calendar/import" },
    ],
  },
  {
    id: "billing-credits",
    title: "Plans, billing, and AI credits",
    summary: "What’s included and how to buy more Reserve.",
    body: [
      "Open Settings → Billing to see usage, plans, and payment.",
      "Monthly AI credits reset each period; AI Reserve rolls over if you buy more.",
      "If generation is blocked, check that you still have credits or Reserve, or upgrade your plan.",
    ],
    links: [{ label: "Billing", href: "/settings/billing-plan" }],
  },
  {
    id: "volunteers",
    title: "Where do volunteers live?",
    summary: "Event shifts and SignUpGenius.",
    body: [
      "Open Volunteers in the left nav for your volunteer master view.",
      "On an event, use the Volunteers tab to connect a SignUpGenius URL and track coverage.",
    ],
    links: [
      { label: "Volunteers", href: "/volunteers" },
      { label: "Events", href: "/events" },
    ],
  },
];

export const HELP_SUPPORT_EMAIL = "hello@heyralli.com";

export function getHelpArticle(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.id === id);
}
