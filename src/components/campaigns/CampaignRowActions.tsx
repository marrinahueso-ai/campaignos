"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarDays,
  CalendarOff,
  MoreHorizontal,
} from "lucide-react";
import { removeFromCampaignsAction } from "@/lib/events/actions";
import { canDemoteToCalendarOnly } from "@/lib/events/communication-strategy";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

interface CampaignRowActionsProps {
  event: Event;
  compact?: boolean;
}

export function CampaignRowActions({ event, compact = false }: CampaignRowActionsProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canRemove = canDemoteToCalendarOnly(event.communicationStrategy);

  function handleRemove() {
    const confirmed = window.confirm(
      `Remove "${event.title}" from Campaigns?\n\nIt will stay on your calendar as a view-only date. You can turn it back into a campaign anytime from the event page.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await removeFromCampaignsAction(event.id);

      if (!result.success) {
        setError(result.error ?? "Unable to remove from campaigns.");
        return;
      }

      setMenuOpen(false);
      router.refresh();
    });
  }

  return (
    <div className={cn("relative flex items-center justify-end gap-1", compact && "justify-end")}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="p-1.5 text-cos-muted transition-colors hover:text-cos-text"
        aria-label={`Actions for ${event.title}`}
        aria-expanded={menuOpen}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] border border-cos-border bg-cos-card py-1 shadow-sm">
            <Link
              href={`/events/${event.id}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
              onClick={() => setMenuOpen(false)}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Open planning hub
            </Link>
            <Link
              href="/calendar"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
              onClick={() => setMenuOpen(false)}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              View on calendar
            </Link>
            {canRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={pending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-error hover:bg-cos-error-bg"
              >
                <CalendarOff className="h-3.5 w-3.5" />
                {pending ? "Removing…" : "Remove from campaigns"}
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="absolute right-0 top-full z-30 mt-2 max-w-xs border border-cos-border bg-cos-card px-2 py-1 text-[10px] text-red-600 shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}
