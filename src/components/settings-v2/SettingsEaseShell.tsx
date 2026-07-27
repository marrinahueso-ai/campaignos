"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsEaseNavIcon } from "@/components/settings-v2/SettingsEaseNavIcons";
import {
  SETTINGS_EASE_NAV_GROUPS,
  isSettingsEaseNavActive,
} from "@/components/settings-v2/settings-ease-nav-config";
import { cn } from "@/lib/utils/cn";

interface SettingsEaseShellProps {
  children: React.ReactNode;
}

export function SettingsEaseShell({ children }: SettingsEaseShellProps) {
  const pathname = usePathname();

  return (
    <div className="settings-ease-shell mx-auto w-full max-w-[84rem] pb-20">
      <div className="settings-ease-layout grid grid-cols-1 items-start gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          className="settings-ease-nav sticky top-5 animate-[settings-ease-rise_0.35s_ease_both] rounded-[20px] border border-[rgba(42,38,34,0.1)] bg-[rgba(255,252,247,0.65)] p-2.5 shadow-[0_8px_28px_rgba(28,36,48,0.06)] max-lg:static max-lg:flex max-lg:flex-wrap max-lg:gap-1 max-lg:p-2"
          aria-label="Settings sections"
        >
          {SETTINGS_EASE_NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className="contents lg:block">
              {groupIndex > 0 ? (
                <div
                  className="my-2 mx-1.5 h-px bg-[rgba(42,38,34,0.1)] max-lg:hidden"
                  aria-hidden
                />
              ) : null}
              <div className="px-3 pt-2 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7a7166] max-lg:hidden">
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = isSettingsEaseNavActive(
                  pathname,
                  item.href,
                  item.exact,
                );

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-[13px] font-semibold transition-[background,color] duration-100 max-lg:w-auto max-lg:px-3 max-lg:py-2",
                      active
                        ? "bg-[#fffcf7] text-[#2a2622] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                        : "bg-transparent text-[#5c554c] hover:bg-[rgba(235,228,217,0.7)] hover:text-[#2a2622]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-[9px] max-lg:hidden",
                        active
                          ? "bg-[#2f4a3c] text-[#f6f2eb]"
                          : "bg-[rgba(47,74,60,0.08)] text-[#2f4a3c]",
                      )}
                    >
                      <SettingsEaseNavIcon icon={item.icon} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <main className="settings-ease-panels min-w-0 animate-[settings-ease-rise_0.35s_ease_both]">
          {children}
        </main>
      </div>
    </div>
  );
}
