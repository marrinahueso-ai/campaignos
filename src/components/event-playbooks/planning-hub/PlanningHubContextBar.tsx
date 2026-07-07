"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  Settings,
} from "lucide-react";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

interface PlanningHubContextBarProps {
  event: Event;
  campaignEvents: Event[];
  notificationCount: number;
  userEmail?: string | null;
}

export function PlanningHubContextBar({
  event,
  campaignEvents,
  notificationCount,
  userEmail,
}: PlanningHubContextBarProps) {
  const router = useRouter();
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const campaignRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (campaignRef.current && !campaignRef.current.contains(event.target as Node)) {
        setCampaignOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const eventsForDropdown =
    campaignEvents.length > 0
      ? campaignEvents
      : [event];

  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border border-[#e8e0d4] bg-[#fffcf7] px-4 py-3 shadow-[0_1px_2px_rgba(42,38,34,0.04)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative" ref={campaignRef}>
          <button
            type="button"
            onClick={() => setCampaignOpen((open) => !open)}
            className="inline-flex max-w-[16rem] items-center gap-1.5 truncate text-sm font-semibold text-[#2a2622] sm:max-w-xs"
            aria-expanded={campaignOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate">{event.title}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#a89f94]" strokeWidth={1.5} />
          </button>

          {campaignOpen && (
            <ul
              role="listbox"
              className="absolute left-0 top-[calc(100%+0.35rem)] z-30 max-h-64 w-72 overflow-y-auto rounded-[10px] border border-[#e8e0d4] bg-[#fffcf7] py-1 shadow-lg"
            >
              {eventsForDropdown.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={entry.id === event.id}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#f6f2eb]",
                      entry.id === event.id && "bg-[#f6f2eb] font-medium",
                    )}
                    onClick={() => {
                      setCampaignOpen(false);
                      if (entry.id !== event.id) {
                        router.push(`/events/${entry.id}`);
                      }
                    }}
                  >
                    {entry.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full bg-[#f5ddd0] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#8b5a42]">
          Planning Hub
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          href="/approvals"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#7a7268] transition-colors hover:bg-[#f6f2eb] hover:text-[#2a2622]"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d97706] px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>

        <Link
          href="/about"
          aria-label="Help"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#7a7268] transition-colors hover:bg-[#f6f2eb] hover:text-[#2a2622]"
        >
          <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
        </Link>

        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#7a7268] transition-colors hover:bg-[#f6f2eb] hover:text-[#2a2622]"
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} />
        </Link>

        <div className="relative hidden sm:block" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((open) => !open)}
            className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-full border border-[#e8e0d4] bg-[#f6f2eb] px-3 py-1.5 text-xs font-medium text-[#2a2622]"
            aria-expanded={userOpen}
          >
            <span className="truncate">{userEmail ?? event.title}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#a89f94]" strokeWidth={1.5} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-48 rounded-[10px] border border-[#e8e0d4] bg-[#fffcf7] py-1 shadow-lg">
              {userEmail && (
                <p className="border-b border-[#e8e0d4] px-3 py-2 text-xs text-[#7a7268]">
                  {userEmail}
                </p>
              )}
              <Link
                href="/settings"
                className="block px-3 py-2 text-sm text-[#2a2622] hover:bg-[#f6f2eb]"
                onClick={() => setUserOpen(false)}
              >
                Account settings
              </Link>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="block w-full px-3 py-2 text-left text-sm text-[#2a2622] hover:bg-[#f6f2eb]"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
