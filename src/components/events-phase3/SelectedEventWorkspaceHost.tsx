"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { EventDetailPhase3Client } from "@/components/events-phase3/EventDetailPhase3Client";
import type { EventDetailTab } from "@/components/events-phase3/EventDetailShell";
import { loadEventWorkspaceShellAction } from "@/lib/events-phase3/actions";
import type { EventWorkspaceShellPayload } from "@/lib/events-phase3/workspace-shell";
import { cn } from "@/lib/utils/cn";

type Props = {
  eventId: string;
  initialTab: string;
  /** Keep mounted but visually hidden when returning to Events home overview. */
  active: boolean;
  onSyncTabUrl: (tab: EventDetailTab) => void;
};

/**
 * Hosts EventDetailShell on `/events?event=&tab=` so workspace cards switch
 * in-shell without remounting Event Detail SSR on every click.
 */
export function SelectedEventWorkspaceHost({
  eventId,
  initialTab,
  active,
  onSyncTabUrl,
}: Props) {
  const [shell, setShell] = useState<EventWorkspaceShellPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const shellEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (shellEventIdRef.current === eventId && shell) {
      return;
    }

    let cancelled = false;
    setError(null);
    if (shellEventIdRef.current !== eventId) {
      setShell(null);
      shellEventIdRef.current = null;
    }

    startTransition(async () => {
      const result = await loadEventWorkspaceShellAction(eventId);
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        setShell(null);
        shellEventIdRef.current = null;
        return;
      }
      setShell(result.data);
      shellEventIdRef.current = eventId;
    });

    return () => {
      cancelled = true;
    };
    // Intentionally only re-bootstrap when the selected event changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shell identity is tracked via ref
  }, [eventId]);

  if (!shell) {
    if (!active) return null;
    if (error) {
      return (
        <div className="rounded-2xl border border-cos-border bg-cos-card p-6">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        </div>
      );
    }
    return (
      <div
        className="animate-pulse space-y-4 rounded-2xl border border-cos-border bg-cos-card p-6"
        data-testid="selected-event-workspace-loading"
        aria-busy
      >
        <div className="h-8 w-48 rounded-lg bg-cos-bg" />
        <div className="h-4 w-72 max-w-full rounded bg-cos-bg" />
        <div className="min-h-[12rem] rounded-xl bg-cos-bg" />
      </div>
    );
  }

  return (
    <div
      className={cn(!active && "hidden")}
      aria-hidden={!active}
      data-testid="selected-event-workspace-host"
    >
      <EventDetailPhase3Client
        key={shell.event.id}
        event={shell.event}
        artwork={shell.artwork}
        playbookName={shell.playbookName}
        responsibilities={shell.responsibilities}
        approvalFlow={shell.approvalFlow}
        heroStats={shell.heroStats}
        canManageAssignments={shell.canManageAssignments}
        workspace={{}}
        initialTab={initialTab}
        committeeId={shell.committeeId}
        committeeName={shell.committeeName}
        navigationMode="events-home"
        onSyncTabUrl={onSyncTabUrl}
      />
    </div>
  );
}
