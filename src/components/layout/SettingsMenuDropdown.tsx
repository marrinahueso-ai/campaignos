"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  SETTINGS_V2_NAV_ITEMS,
  isSettingsNavActive,
} from "@/components/settings-v2/settings-nav-config";
import { cn } from "@/lib/utils/cn";

export function SettingsMenuDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const onSettings = pathname.startsWith("/settings");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Close when navigating to a settings section.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-9 w-9 items-center justify-center border border-transparent transition-colors",
          open || onSettings
            ? "border-cos-border bg-cos-dark text-[#f6f2eb]"
            : "text-cos-muted hover:border-cos-border hover:bg-cos-bg hover:text-cos-text",
        )}
      >
        <Settings className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close settings menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            role="menu"
            aria-label="Settings sections"
            className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] border border-cos-border bg-cos-card p-1.5 shadow-lg"
          >
            <ul className="max-h-[min(28rem,70vh)] space-y-0.5 overflow-y-auto">
              {SETTINGS_V2_NAV_ITEMS.map((item) => {
                const active = isSettingsNavActive(
                  pathname,
                  item.href,
                  item.exact,
                );

                return (
                  <li key={item.href} role="none">
                    <Link
                      href={item.href}
                      role="menuitem"
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded-md border px-3 py-2.5 transition-colors",
                        active
                          ? "border-cos-primary bg-cos-primary text-[#f6f2eb]"
                          : "border-transparent text-cos-text hover:border-cos-border hover:bg-cos-bg",
                      )}
                    >
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>
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
          </div>
        </>
      ) : null}
    </div>
  );
}
