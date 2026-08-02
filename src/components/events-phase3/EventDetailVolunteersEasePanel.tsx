"use client";

import { useEffect, useState, useTransition } from "react";
import {
  EaseBtnPrimary,
  EaseBox,
  EaseBoxDesc,
  EaseBoxTitle,
  EaseSectionLabel,
  EaseSoftActions,
} from "@/components/events-phase3/EventDetailEaseUi";
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
      <div className="min-h-[12rem] animate-pulse rounded-[22px] bg-cos-bg/60" />
    );
  }

  // Full connect → review → confirm lives in EventVolunteersTab (date allowlist).
  if (review) {
    return <EventVolunteersTab event={event} />;
  }

  if (empty || showReplace) {
    return (
      <section>
        <EaseSectionLabel hint="Connect a public SignUpGenius link">
          Volunteers
        </EaseSectionLabel>
        <EaseBox>
          <EaseBoxTitle>
            {showReplace ? "Replace signup link" : "Connect a signup link"}
          </EaseBoxTitle>
          <EaseBoxDesc>
            Paste this event’s public SignUpGenius page to import role fill and
            named volunteers when names are public — without leaving event
            detail.
          </EaseBoxDesc>
          {error ? (
            <p className="mb-3 text-sm text-[#a65a3a]">{error}</p>
          ) : null}
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.signupgenius.com/…"
            className="mb-3 w-full rounded-2xl border border-cos-border bg-cos-card px-3.5 py-3 text-sm text-cos-text"
          />
          <EaseSoftActions>
            <EaseBtnPrimary
              disabled={
                pending ||
                !(empty?.canManage ?? overview?.canManage ?? false)
              }
              onClick={showReplace ? handleReplace : handleConnect}
            >
              Connect signup
            </EaseBtnPrimary>
            {showReplace ? (
              <button
                type="button"
                className="text-sm font-bold text-cos-muted underline-offset-2 hover:underline"
                onClick={() => {
                  setShowReplace(false);
                  setUrl("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </EaseSoftActions>
          {!(empty?.canManage ?? overview?.canManage) ? (
            <p className="mt-3 text-sm text-cos-muted">
              Ask a team admin to connect the signup link.
            </p>
          ) : null}
        </EaseBox>
      </section>
    );
  }

  if (!overview?.snapshot) {
    return (
      <section>
        <EaseSectionLabel>Volunteers</EaseSectionLabel>
        <p className="text-sm text-cos-muted">
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
