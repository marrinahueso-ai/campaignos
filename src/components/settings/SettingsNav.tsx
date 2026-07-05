"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const SETTINGS_TABS = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/posting-schedule", label: "Posting schedule" },
  { href: "/settings/school-setup", label: "School Setup" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/meta", label: "Meta" },
  { href: "/settings/canva", label: "Canva" },
  { href: "/settings/monday", label: "Monday" },
  { href: "/settings/ai-brain", label: "AI Brain" },
  { href: "/settings/playbooks", label: "Playbooks" },
] as const;

function isTabActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 border-b border-cos-border"
      aria-label="Settings sections"
    >
      <div className="-mb-px flex gap-0 overflow-x-auto">
        {SETTINGS_TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href, "exact" in tab ? tab.exact : false);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 text-sm transition-colors",
                active
                  ? "border-cos-primary font-medium text-cos-text"
                  : "border-transparent text-cos-muted hover:border-cos-border hover:text-cos-text",
              )}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
