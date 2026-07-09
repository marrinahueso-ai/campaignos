"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_V2_NAV_ITEMS } from "@/components/settings-v2/settings-nav-config";
import { cn } from "@/lib/utils/cn";

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href;
  }

  if (href === "/settings/billing-plan") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsV2Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="w-full shrink-0 lg:w-56"
      aria-label="Settings sections"
    >
      <ul className="space-y-1">
        {SETTINGS_V2_NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href, item.exact);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-md border px-3 py-2.5 transition-colors",
                  active
                    ? "border-cos-primary bg-cos-primary text-[#f6f2eb]"
                    : "border-transparent text-cos-text hover:border-cos-border hover:bg-cos-card",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs leading-snug",
                    active ? "text-[#f6f2eb]/80" : "text-cos-muted",
                  )}
                >
                  {item.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
