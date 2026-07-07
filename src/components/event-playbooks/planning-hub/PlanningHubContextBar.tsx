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
import { PH } from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
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
            className="font-display inline-flex max-w-[16rem] items-center gap-1.5 truncate text-base font-bold sm:max-w-xs"
            style={{ color: PH.textPrimary }}
            aria-expanded={campaignOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate">{event.title}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0"
              style={{ color: PH.textMuted }}
              strokeWidth={1.5}
            />
          </button>

          {campaignOpen && (
            <ul
              role="listbox"
              className="absolute left-0 top-[calc(100%+0.35rem)] z-30 max-h-64 w-72 overflow-y-auto rounded-[12px] border bg-white py-1 shadow-lg"
              style={{ borderColor: PH.cardBorder }}
            >
              {eventsForDropdown.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={entry.id === event.id}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#FAF7F2]",
                      entry.id === event.id && "bg-[#FAF7F2] font-medium",
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

        <span
          className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
          style={{ backgroundColor: PH.peachBadge, color: PH.peachBadgeText }}
        >
          Planning Hub
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/approvals"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/80"
          style={{ color: PH.textSecondary }}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          {notificationCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ backgroundColor: PH.orange }}
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>

        <Link
          href="/about"
          aria-label="Help"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/80"
          style={{ color: PH.textSecondary }}
        >
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </Link>

        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/80"
          style={{ color: PH.textSecondary }}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </Link>

        <div className="relative hidden sm:block" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((open) => !open)}
            className="font-display inline-flex max-w-[10rem] items-center gap-1 truncate text-sm font-bold"
            style={{ color: PH.textPrimary }}
            aria-expanded={userOpen}
          >
            <span className="truncate">{displayName}</span>
            <ChevronDown
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: PH.textMuted }}
              strokeWidth={1.5}
            />
          </button>

          {userOpen && (
            <div
              className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-48 rounded-[12px] border bg-white py-1 shadow-lg"
              style={{ borderColor: PH.cardBorder }}
            >
              {userEmail && (
                <p
                  className="border-b px-3 py-2 text-xs"
                  style={{ borderColor: PH.cardBorder, color: PH.textSecondary }}
                >
                  {userEmail}
                </p>
              )}
              <Link
                href="/settings"
                className="block px-3 py-2 text-sm hover:bg-[#FAF7F2]"
                style={{ color: PH.textPrimary }}
                onClick={() => setUserOpen(false)}
              >
                Account settings
              </Link>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#FAF7F2]"
                  style={{ color: PH.textPrimary }}
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
