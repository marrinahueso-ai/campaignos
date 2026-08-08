"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import {
  ew,
  ewCard,
} from "@/components/events-phase3/event-workspace-tokens";
import { EventVolunteerRosterEase } from "@/components/events-phase3/EventVolunteerRosterEase";
import { EventVolunteersTab } from "@/components/events-phase3/EventVolunteersTab";
import {
  connectVolunteerSourceAction,
  getEventVolunteerOverviewAction,
  refreshVolunteerStatsAction,
  replaceVolunteerSourceAction,
} from "@/lib/event-volunteers/actions";
import { validateSignUpGeniusUrl } from "@/lib/event-volunteers/url";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

type OverviewPayload = Awaited<
  ReturnType<typeof getEventVolunteerOverviewAction>
>;

export function EventDetailVolunteersEasePanel({ event }: { event: Event }) {
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [pending, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const result = await getEventVolunteerOverviewAction(event.id);
      setPayload(result);
      if (!result.success) {
        setError(result.error ?? "Unable to load volunteer numbers.");
      } else {
        setError(null);
      }
    });
  }

  useEffect(() => {
    setShowReplace(false);
    setUrl("");
    setError(null);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per event
  }, [event.id]);

  const overview =
    payload?.success && payload.state === "overview" ? payload : null;
  const empty = payload?.success && payload.state === "empty" ? payload : null;
  const review =
    payload?.success && payload.state === "review" ? payload : null;

  const handleConnect = () => {
    const validated = validateSignUpGeniusUrl(url);
    if ("error" in validated) {
      setError(validated.error);
      return;
    }
    startTransition(async () => {
      const result = await connectVolunteerSourceAction({
        eventId: event.id,
        sourceUrl: validated.normalizedHref,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to connect that signup link.");
        return;
      }
      setUrl("");
      setShowReplace(false);
      reload();
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      const result = await refreshVolunteerStatsAction({ eventId: event.id });
      if (!result.success) {
        setError(result.error ?? "Unable to refresh volunteer numbers.");
        return;
      }
      reload();
    });
  };

  const handleReplace = () => {
    const validated = validateSignUpGeniusUrl(url);
    if ("error" in validated) {
      setError(validated.error);
      return;
    }
    startTransition(async () => {
      const result = await replaceVolunteerSourceAction({
        eventId: event.id,
        sourceUrl: validated.normalizedHref,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to replace that signup link.");
        return;
      }
      setUrl("");
      setShowReplace(false);
      reload();
    });
  };

  if (!payload) {
    return (
      <div className="min-h-[12rem] animate-pulse rounded-2xl bg-[#f4f0ea]" />
    );
  }

  // Full connect → review → confirm lives in EventVolunteersTab (date allowlist).
  if (review) {
    return <EventVolunteersTab event={event} />;
  }

  if (empty || showReplace) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className={cn("font-display text-2xl", ew.ink)}>Volunteers</h2>
          <p className={cn("mt-1 text-sm", ew.inksoft)}>
            Connect a public SignUpGenius link to see roles, shifts, and
            arrivals here.
          </p>
        </div>
        <div className={cn(ewCard, "mx-auto max-w-xl px-6 py-10 text-center")}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#e6dfd5] bg-[#faf8f5]">
            <Link2 className={cn("h-6 w-6", ew.sageDeep)} aria-hidden />
          </div>
          <h3 className={cn("font-display text-xl", ew.ink)}>
            {showReplace ? "Replace signup link" : "No Signup Connected"}
          </h3>
          <p className={cn("mx-auto mt-2 max-w-md text-sm", ew.inksoft)}>
            Connect your volunteer signup from SignUpGenius to see roles,
            shifts, and arrivals here in your workspace.
          </p>
          {error ? (
            <p className="mt-3 text-sm text-[#a65a3a]">{error}</p>
          ) : null}
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.signupgenius.com/…"
            className="mt-5 w-full rounded-2xl border border-[#e6dfd5] bg-white px-3.5 py-3 text-left text-sm text-[#1c352d]"
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={
                pending || !(empty?.canManage ?? overview?.canManage ?? false)
              }
              onClick={showReplace ? handleReplace : handleConnect}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50",
                ew.fillInk,
              )}
            >
              Connect SignupGenius
            </button>
            {showReplace ? (
              <button
                type="button"
                className={cn(
                  "text-sm font-medium underline-offset-2 hover:underline",
                  ew.inksoft,
                )}
                onClick={() => {
                  setShowReplace(false);
                  setUrl("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {!(empty?.canManage ?? overview?.canManage) ? (
            <p className={cn("mt-4 text-sm", ew.inksoft)}>
              Ask a team admin to connect the signup link.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  if (!overview?.snapshot) {
    return (
      <section>
        <h2 className={cn("font-display text-2xl", ew.ink)}>Volunteers</h2>
        <p className={cn("mt-2 text-sm", ew.inksoft)}>
          {error ?? "Volunteer numbers aren’t available yet."}
        </p>
      </section>
    );
  }

  return (
    <EventVolunteerRosterEase
      eventId={event.id}
      source={overview.source}
      snapshot={overview.snapshot}
      canManage={overview.canManage}
      pending={pending}
      error={error ?? overview.autoRefreshError}
      onRefresh={handleRefresh}
      onReplaceConnect={() => setShowReplace(true)}
    />
  );
}
