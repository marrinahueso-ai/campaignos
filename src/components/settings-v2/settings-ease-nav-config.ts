export interface SettingsEaseNavItem {
  href: string;
  label: string;
  id: string;
  exact?: boolean;
  icon:
    | "overview"
    | "organization"
    | "branding"
    | "team"
    | "integrations"
    | "billing"
    | "account";
}

export interface SettingsEaseNavGroup {
  label: string;
  items: SettingsEaseNavItem[];
}

export function isSettingsEaseNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
): boolean {
  if (exact) {
    return pathname === href;
  }

  if (href === "/settings/billing-plan") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href === "/settings/integrations") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/settings/meta") ||
      pathname.startsWith("/settings/canva") ||
      pathname.startsWith("/settings/monday")
    );
  }

  if (href === "/settings/branding") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/settings/school-year") ||
      pathname.startsWith("/settings/ai-brain") ||
      pathname.startsWith("/settings/inbox-ai") ||
      pathname.startsWith("/settings/playbooks-milestones") ||
      pathname.startsWith("/settings/playbooks-milestones") ||
      pathname.startsWith("/onboarding/brand")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Soft left nav — exact Settings Ease mockup sections → real routes. */
export const SETTINGS_EASE_NAV_GROUPS: SettingsEaseNavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        id: "overview",
        href: "/settings",
        label: "Overview",
        icon: "overview",
        exact: true,
      },
      {
        id: "organization",
        href: "/settings/organization",
        label: "Organization",
        icon: "organization",
      },
      {
        id: "branding",
        href: "/settings/branding",
        label: "Branding",
        icon: "branding",
      },
      {
        id: "team",
        href: "/settings/team-access",
        label: "Team & Access",
        icon: "team",
      },
    ],
  },
  {
    label: "Connections",
    items: [
      {
        id: "integrations",
        href: "/settings/integrations",
        label: "Integrations",
        icon: "integrations",
      },
      {
        id: "billing",
        href: "/settings/billing-plan",
        label: "Billing & Plan",
        icon: "billing",
      },
    ],
  },
  {
    label: "You",
    items: [
      {
        id: "account",
        href: "/settings/account",
        label: "Account",
        icon: "account",
      },
    ],
  },
];
