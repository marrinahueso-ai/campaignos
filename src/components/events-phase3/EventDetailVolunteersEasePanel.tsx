"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  EaseBtnPrimary,
  EaseBtnSecondary,
  EaseBox,
  EaseBoxDesc,
  EaseBoxTitle,
  EaseChip,
  EaseQueue,
  EaseRow,
  EaseSectionLabel,
  EaseSoftActions,
  EaseSplit,
} from "@/components/events-phase3/EventDetailEaseUi";
import { EventVolunteersTab } from "@/components/events-phase3/EventVolunteersTab";
import { EventContextFileUpload } from "@/components/campaign-files/EventContextFileUpload";
import {
  connectVolunteerSourceAction,
  getEventVolunteerOverviewAction,
  refreshVolunteerStatsAction,
} from "@/lib/event-volunteers/actions";
import { formatSyncTime } from "@/lib/event-volunteers/ai-summary";
import { validateSignUpGeniusUrl } from "@/lib/event-volunteers/url";
import type { Event } from "@/types";

type OverviewPayload = Awaited<
  ReturnType<typeof getEventVolunteerOverviewAction>
>;

export function EventDetailVolunteersEasePanel({ event }: { event: Event }) {
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
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
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per event
  }, [event.id]);

  const overview =
    payload?.success && payload.state === "overview" ? payload : null;
  const empty = payload?.success && payload.state === "empty" ? payload : null;
  const review =
    payload?.success && payload.state === "review" ? payload : null;

  const openRoles = useMemo(() => {
    const assignments = overview?.snapshot?.assignments ?? [];
    return [...assignments]
      .filter((a) => (a.quantityOpen ?? 0) > 0)
      .sort((a, b) => (b.quantityOpen ?? 0) - (a.quantityOpen ?? 0))
      .slice(0, 5);
  }, [overview?.snapshot?.assignments]);

  const fill = overview?.snapshot?.summary.overallFilledPercent ?? null;
  const openSpots = overview?.snapshot?.summary.openSpots ?? null;
  const needsAttention = fill !== null && fill < 50;

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

  if (!payload) {
    return (
      <div className="min-h-[12rem] animate-pulse rounded-[22px] bg-cos-bg/60" />
    );
  }

  // Full connect → review → confirm lives in EventVolunteersTab (date allowlist).
  if (review) {
    return <EventVolunteersTab event={event} />;
  }

  if (empty) {
    return (
      <section>
        <EaseSectionLabel hint="Counts only — no names or contact details">
          Staffing health
        </EaseSectionLabel>
        <EaseBox>
          <EaseBoxTitle>Connect a signup link</EaseBoxTitle>
          <EaseBoxDesc>
            Paste this event’s public SignUpGenius page to see fill rate and
            open roles — without leaving event detail.
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
              disabled={pending || !empty.canManage}
              onClick={handleConnect}
            >
              Connect signup
            </EaseBtnPrimary>
          </EaseSoftActions>
          {!empty.canManage ? (
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
        <EaseSectionLabel>Staffing health</EaseSectionLabel>
        <p className="text-sm text-cos-muted">
          {error ?? "Volunteer numbers aren’t available yet."}
        </p>
      </section>
    );
  }

  const signupUrl = overview.source.sourceUrl;
  const updatedLabel = overview.source.lastSuccessfulSyncAt
    ? formatSyncTime(overview.source.lastSuccessfulSyncAt)
    : "not yet";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <EaseSectionLabel hint="Counts only — no names or contact details">
          Staffing health
        </EaseSectionLabel>
        <EventContextFileUpload eventId={event.id} uploadContext="volunteers" disabled={pending} />
      </div>

      {error ? (
        <p className="mb-3 text-sm text-[#a65a3a]">{error}</p>
      ) : null}

      <EaseSplit>
        <EaseBox>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-cos-muted">
            {needsAttention ? (
              <EaseChip tone="warn">Needs attention</EaseChip>
            ) : (
              <EaseChip tone="forest">On track</EaseChip>
            )}
            <span>
              {fill !== null ? `${fill}% filled` : "Fill not available yet"}
            </span>
          </div>
          <EaseBoxTitle>
            {openSpots !== null && openSpots > 0
              ? `${openRoles.length || openSpots} roles still open`
              : "Roles look covered"}
          </EaseBoxTitle>
          <EaseBoxDesc>
            {needsAttention
              ? "Share the signup before the week fills up."
              : "Keep an eye on last-minute openings."}
          </EaseBoxDesc>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(42,38,34,0.08)]">
            <i
              className="block h-full rounded-full"
              style={{
                width: `${Math.min(100, fill ?? 0)}%`,
                background: needsAttention ? "#a65a3a" : "#c4922e",
              }}
            />
          </div>
          <div className="mt-3.5">
            <EaseQueue>
              {openRoles.length === 0 ? (
                <EaseRow
                  title="No open roles right now"
                  meta="Role"
                  status="Full"
                  statusTone="done"
                  as="div"
                />
              ) : (
                openRoles.map((role) => (
                  <EaseRow
                    key={role.externalKey}
                    title={role.name}
                    meta="Role"
                    status={`${role.quantityOpen ?? 0} open`}
                    statusTone="open"
                    as="div"
                  />
                ))
              )}
            </EaseQueue>
          </div>
          <EaseSoftActions>
            {signupUrl ? (
              <EaseBtnPrimary href={signupUrl}>Open signup</EaseBtnPrimary>
            ) : null}
            <EaseBtnSecondary disabled={pending} onClick={handleRefresh}>
              Refresh numbers
            </EaseBtnSecondary>
          </EaseSoftActions>
        </EaseBox>

        <EaseBox>
          <EaseBoxTitle>Signup link</EaseBoxTitle>
          <EaseBoxDesc>
            Connect and refresh stay on this event — the Volunteers page only
            shows organization-wide staffing.
          </EaseBoxDesc>
          <EaseQueue>
            <EaseRow
              title="SignUpGenius"
              meta={`Connected · updated ${updatedLabel}`}
              status="Live"
              statusTone="done"
              as="div"
            />
          </EaseQueue>
        </EaseBox>
      </EaseSplit>
    </section>
  );
}
