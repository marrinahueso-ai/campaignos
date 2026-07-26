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
        setError(result.error ?? "Unable to load volunteer stats.");
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

  const assignments = overview?.snapshot?.assignments ?? [];

  const openRoles = useMemo(() => {
    return [...assignments]
      .filter((a) => (a.quantityOpen ?? 0) > 0)
      .sort((a, b) => (b.quantityOpen ?? 0) - (a.quantityOpen ?? 0))
      .slice(0, 5);
  }, [assignments]);

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
        setError(result.error ?? "Unable to connect.");
        return;
      }
      setUrl("");
      reload();
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      const result = await refreshVolunteerStatsAction({ eventId: event.id });
      if (!result.success) {
        setError(result.error ?? "Unable to sync.");
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

  if (empty) {
    return (
      <section>
        <EaseSectionLabel hint="Aggregate only — no volunteer PII">
          Staffing health
        </EaseSectionLabel>
        <EaseBox>
          <EaseBoxTitle>Connect SignUpGenius</EaseBoxTitle>
          <EaseBoxDesc>
            Link this event’s signup page to see fill rate and open roles —
            without leaving event detail.
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
            <EaseBtnPrimary disabled={pending || !empty.canManage} onClick={handleConnect}>
              Connect signup
            </EaseBtnPrimary>
          </EaseSoftActions>
        </EaseBox>
      </section>
    );
  }

  if (review) {
    return (
      <section>
        <EaseSectionLabel hint="Aggregate only — no volunteer PII">
          Staffing health
        </EaseSectionLabel>
        <EaseBox>
          <EaseBoxTitle>Confirm this signup</EaseBoxTitle>
          <EaseBoxDesc>
            A SignUpGenius link is waiting for review. Confirm roles to start
            tracking fill on this event.
          </EaseBoxDesc>
          <EaseSoftActions>
            <EaseBtnSecondary href={`/volunteers?event=${event.id}`}>
              Finish setup
            </EaseBtnSecondary>
          </EaseSoftActions>
        </EaseBox>
      </section>
    );
  }

  if (!overview?.snapshot) {
    return (
      <section>
        <EaseSectionLabel>Staffing health</EaseSectionLabel>
        <p className="text-sm text-cos-muted">
          {error ?? "Volunteer overview unavailable."}
        </p>
      </section>
    );
  }

  const signupUrl = overview.source.sourceUrl;
  const syncLabel = overview.source.lastSuccessfulSyncAt
    ? formatSyncTime(overview.source.lastSuccessfulSyncAt)
    : "not yet";

  return (
    <section>
      <EaseSectionLabel hint="Aggregate only — no volunteer PII">
        Staffing health
      </EaseSectionLabel>

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
            <span>{fill !== null ? `${fill}% filled` : "Fill unknown"}</span>
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
            <EaseBtnSecondary disabled={pending} onClick={handleSync}>
              Sync SignUpGenius
            </EaseBtnSecondary>
          </EaseSoftActions>
        </EaseBox>

        <EaseBox>
          <EaseBoxTitle>Connected source</EaseBoxTitle>
          <EaseBoxDesc>
            Last sync looks fresh. Connect &amp; refresh stay here — not on
            Volunteer Master.
          </EaseBoxDesc>
          <EaseQueue>
            <EaseRow
              title="SignUpGenius"
              meta={`Connected · synced ${syncLabel}`}
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
