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
  greetingName: string;
  userEmail?: string | null;
}

export function PlanningHubContextBar({
  event,
  campaignEvents,
  notificationCount,
  greetingName,
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

  const displayName = greetingName.trim() || userEmail?.split("@")[0] || "Account";

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative" ref={campaignRef}>
          <button
            type="button"
            onClick={() => setCampaignOpen((open) => !open)}
            className="font-display inline-flex max-w-[16rem] items-center gap-1.5 truncate text-base font-bold text-cos-text sm:max-w-xs"
            aria-expanded={campaignOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate">{event.title}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-cos-dark-muted"
              strokeWidth={1.5}
            />
          </button>

          {campaignOpen && (
            <ul
              role="listbox"
              className="absolute left-0 top-[calc(100%+0.35rem)] z-30 max-h-64 w-72 overflow-y-auto rounded-[12px] border border-cos-border bg-cos-card py-1 shadow-lg"
            >
              {eventsForDropdown.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={entry.id === event.id}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm text-cos-text transition-colors hover:bg-cos-bg",
                      entry.id === event.id && "bg-cos-bg font-medium",
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

        <span className="inline-flex shrink-0 items-center rounded-full bg-cos-warning px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-cos-warning-text">
          Planning Hub
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/approvals"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg-alt hover:text-cos-text"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cos-error px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>

        <Link
          href="/about"
          aria-label="Help"
          className="flex h-9 w-9 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg-alt hover:text-cos-text"
        >
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </Link>

        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg-alt hover:text-cos-text"
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </Link>

        <div className="relative hidden sm:block" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((open) => !open)}
            className="font-display inline-flex max-w-[10rem] items-center gap-1 truncate text-sm font-bold text-cos-text"
            aria-expanded={userOpen}
          >
            <span className="truncate">{displayName}</span>
            <ChevronDown
              className="h-3.5 w-3.5 shrink-0 text-cos-dark-muted"
              strokeWidth={1.5}
            />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-48 rounded-[12px] border border-cos-border bg-cos-card py-1 shadow-lg">
              {userEmail && (
                <p className="border-b border-cos-border px-3 py-2 text-xs text-cos-muted">
                  {userEmail}
                </p>
              )}
              <Link
                href="/settings"
                className="block px-3 py-2 text-sm text-cos-text hover:bg-cos-bg"
                onClick={() => setUserOpen(false)}
              >
                Account settings
              </Link>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="block w-full px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
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
