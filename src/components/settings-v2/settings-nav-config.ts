export interface SettingsV2NavItem {
  href: string;
  label: string;
  description: string;
  exact?: boolean;
}

export const SETTINGS_V2_NAV_ITEMS: SettingsV2NavItem[] = [
  {
    href: "/settings",
    label: "Overview",
    description: "Quick summary of your account",
    exact: true,
  },
  {
    href: "/settings/organization",
    label: "Organization",
    description: "Profile, branding, and timezone",
  },
  {
    href: "/settings/team-access",
    label: "Team & Access",
    description: "Members, roles, and permissions",
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    description: "Connect tools and platforms",
  },
  {
    href: "/settings/ai-brain",
    label: "AI Brain",
    description: "How Hey Ralli thinks and writes",
  },
  {
    href: "/settings/inbox-ai",
    label: "Inbox AI",
    description: "Sources and FAQ content",
  },
  {
    href: "/settings/posting-schedule",
    label: "Posting Schedule",
    description: "Best times and posting windows",
  },
  {
    href: "/settings/playbooks-milestones",
    label: "Playbooks",
    description: "Communication playbooks",
  },
  {
    href: "/settings/school-setup",
    label: "School Setup",
    description: "School info and resources",
  },
  {
    href: "/settings/billing-plan",
    label: "Billing & Plan",
    description: "Subscription and payment",
  },
  {
    href: "/settings/advanced",
    label: "Advanced",
    description: "System and data settings",
  },
];

export const SETTINGS_TAB_REDIRECTS: Record<string, string> = {
  "board-roster": "/settings/team-access",
  general: "/settings",
  team: "/settings/team-access",
  organization: "/settings/organization",
  meta: "/settings/integrations",
  canva: "/settings/integrations",
  monday: "/settings/integrations",
  "ai-brain": "/settings/ai-brain",
  "inbox-ai": "/settings/inbox-ai",
  "inbox-ai-sources": "/settings/inbox-ai",
  playbooks: "/settings/playbooks-milestones",
  "posting-schedule": "/settings/posting-schedule",
  "school-setup": "/settings/school-setup",
  billing: "/settings/billing-plan",
  advanced: "/settings/advanced",
};
