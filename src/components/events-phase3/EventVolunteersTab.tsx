"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  Lock,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  cancelVolunteerReviewAction,
  confirmVolunteerOverviewAction,
  connectVolunteerSourceAction,
  disconnectVolunteerSourceAction,
  getEventVolunteerOverviewAction,
  refreshVolunteerStatsAction,
  replaceVolunteerSourceAction,
} from "@/lib/event-volunteers/actions";
import {
  describeNeedsSnapshot,
  formatSyncTime,
  type VolunteerAiSummary,
} from "@/lib/event-volunteers/ai-summary";
import { availabilityStatusLabel } from "@/lib/event-volunteers/stats";
import type {
  VolunteerAssignmentView,
  VolunteerAvailabilityStatus,
  VolunteerSnapshotRecord,
  VolunteerSourceRecord,
  VolunteerSyncAttemptRecord,
} from "@/lib/event-volunteers/types";
import { truncateUrl, validateSignUpGeniusUrl } from "@/lib/event-volunteers/url";
import type { Event } from "@/types";

interface EventVolunteersTabProps {
  event: Event;
}

type OverviewPayload = Awaited<
  ReturnType<typeof getEventVolunteerOverviewAction>
>;

type FilterId = "all" | VolunteerAvailabilityStatus;
type SortId =
  | "most_needed"
  | "least_filled"
  | "most_filled"
  | "date"
  | "name";

function formatEventWhen(event: {
  date: string;
  time: string | null;
}): string {
  try {
    const date = new Date(`${event.date}T12:00:00`);
    const dateLabel = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return event.time ? `${dateLabel} · ${event.time}` : dateLabel;
  } catch {
    return event.date;
  }
}

function daysUntil(date: string): number | null {
  const target = new Date(`${date}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

function statusBadgeClass(status: VolunteerAvailabilityStatus): string {
  switch (status) {
    case "high_need":
      return "bg-red-50 text-red-700";
    case "needs_help":
      return "bg-amber-50 text-amber-800";
    case "nearly_full":
      return "bg-orange-50 text-orange-800";
    case "full":
      return "bg-emerald-50 text-emerald-800";
    case "unknown":
      return "bg-stone-100 text-stone-600";
  }
}

function formatAssignmentWhen(assignment: VolunteerAssignmentView): string {
  const parts: string[] = [];
  if (assignment.date) {
    try {
      parts.push(
        new Date(`${assignment.date}T12:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    } catch {
      parts.push(assignment.date);
    }
  }
  if (assignment.startTime || assignment.endTime) {
    parts.push(
      [assignment.startTime, assignment.endTime].filter(Boolean).join(" – "),
    );
  }
  return parts.join(", ") || "—";
}

function filledLabel(assignment: VolunteerAssignmentView): string {
  if (
    assignment.quantityFilled === null ||
    assignment.quantityRequested === null
  ) {
    return "—";
  }
  return `${assignment.quantityFilled} of ${assignment.quantityRequested}`;
}

function progressPercent(assignment: VolunteerAssignmentView): number | null {
  if (
    assignment.quantityRequested === null ||
    assignment.quantityRequested <= 0 ||
    assignment.quantityFilled === null
  ) {
    return null;
  }
  return Math.min(
    100,
    Math.round(
      (assignment.quantityFilled / assignment.quantityRequested) * 100,
    ),
  );
}

export function EventVolunteersTab({ event }: EventVolunteersTabProps) {
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"loading" | "idle">("loading");
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("most_needed");
  const [selected, setSelected] = useState<VolunteerAssignmentView | null>(null);
  const [showReplace, setShowReplace] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);

  function reload() {
    startTransition(async () => {
      setPhase("loading");
      const result = await getEventVolunteerOverviewAction(event.id);
      setPayload(result);
      setPhase("idle");
      if (!result.success) {
        setError(result.error ?? "Unable to load volunteer stats.");
      } else {
        setError(null);
      }
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per event
  }, [event.id]);

  const canManage = payload?.success ? payload.canManage : false;

  function handleConnect() {
    const validated = validateSignUpGeniusUrl(url);
    if ("error" in validated) {
      setError(validated.error);
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await connectVolunteerSourceAction({
        eventId: event.id,
        sourceUrl: validated.normalizedHref,
      });
      if (!result.success) {
        setError(result.error ?? "Could not connect signup.");
        return;
      }
      reload();
    });
  }

  function handleConfirm(sourceId: string, snapshotId: string) {
    startTransition(async () => {
      const result = await confirmVolunteerOverviewAction({
        eventId: event.id,
        sourceId,
        snapshotId,
      });
      if (!result.success) {
        setError(result.error ?? "Could not confirm overview.");
        return;
      }
      reload();
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshVolunteerStatsAction({ eventId: event.id });
      if (!result.success) {
        setError(result.error ?? "Could not refresh stats.");
      }
      reload();
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectVolunteerSourceAction({ eventId: event.id });
      if (!result.success) {
        setError(result.error ?? "Could not disconnect signup.");
        return;
      }
      setUrl("");
      reload();
    });
  }

  function handleCancelReview() {
    startTransition(async () => {
      await cancelVolunteerReviewAction({ eventId: event.id });
      setUrl("");
      reload();
    });
  }

  function handleReplace() {
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
        setError(result.error ?? "Could not replace signup link.");
        return;
      }
      setShowReplace(false);
      reload();
    });
  }

  async function copyText(value: string, note: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNote(note);
      setTimeout(() => setCopyNote(null), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  if (phase === "loading" && !payload) {
    return (
      <section className="rounded-xl border border-cos-border bg-white p-6">
        <p className="text-sm text-cos-muted">Loading volunteer overview…</p>
      </section>
    );
  }

  if (!payload?.success) {
    return (
      <section className="rounded-xl border border-cos-border bg-white p-6">
        <p className="text-sm text-red-700">
          {payload && !payload.success
            ? payload.error
            : error || "Unable to load volunteer stats."}
        </p>
      </section>
    );
  }

  if (payload.state === "empty") {
    return (
      <VolunteerEmptyState
        url={url}
        onUrlChange={setUrl}
        onConnect={handleConnect}
        canManage={canManage}
        isPending={isPending}
        error={error}
      />
    );
  }

  if (payload.state === "review") {
    return (
      <VolunteerConnectionReview
        eventTitle={event.title}
        snapshot={payload.snapshot}
        source={payload.source}
        canManage={canManage}
        isPending={isPending}
        error={error}
        onConfirm={() => {
          if (payload.source && payload.snapshot) {
            handleConfirm(payload.source.id, payload.snapshot.id);
          }
        }}
        onCancel={handleCancelReview}
        onTryAgain={handleRefresh}
      />
    );
  }

  const source = payload.source as VolunteerSourceRecord;
  const snapshot = payload.snapshot as VolunteerSnapshotRecord | null;
  const ai = payload.ai;
  const syncAttempts = payload.syncAttempts as VolunteerSyncAttemptRecord[];

  if (!snapshot) {
    return (
      <VolunteerEmptyState
        url={url || source.sourceUrl}
        onUrlChange={setUrl}
        onConnect={handleConnect}
        canManage={canManage}
        isPending={isPending}
        error={error || "Connect again to create the volunteer overview."}
      />
    );
  }

  return (
    <VolunteerOverview
      event={event}
      source={source}
      snapshot={snapshot}
      ai={ai}
      syncAttempts={syncAttempts}
      canManage={canManage}
      isPending={isPending}
      error={error || payload.autoRefreshError}
      filter={filter}
      sort={sort}
      selected={selected}
      showReplace={showReplace}
      showHistory={showHistory}
      replaceUrl={url}
      copyNote={copyNote}
      onFilterChange={setFilter}
      onSortChange={setSort}
      onSelect={setSelected}
      onRefresh={handleRefresh}
      onDisconnect={handleDisconnect}
      onToggleReplace={() => setShowReplace((v) => !v)}
      onToggleHistory={() => setShowHistory((v) => !v)}
      onReplaceUrlChange={setUrl}
      onReplace={handleReplace}
      onCopyUrl={() => copyText(source.sourceUrl, "Signup URL copied")}
      onCopyMessage={() =>
        ai
          ? copyText(ai.suggestedMessage, "Suggested message copied")
          : undefined
      }
    />
  );
}

function VolunteerEmptyState({
  url,
  onUrlChange,
  onConnect,
  canManage,
  isPending,
  error,
}: {
  url: string;
  onUrlChange: (value: string) => void;
  onConnect: () => void;
  canManage: boolean;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-xl border border-cos-border bg-white p-5 sm:p-8">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cos-border bg-cos-bg">
          <Users className="h-6 w-6 text-cos-muted" strokeWidth={1.5} />
        </div>
        <h2 className="mt-4 font-display text-3xl text-cos-text">
          Volunteer Overview
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          Connect this event’s SignUpGenius page to view volunteer coverage,
          open assignments, and AI recommendations.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-xl space-y-3">
        <Input
          label="SignUpGenius URL"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://www.signupgenius.com/go/…"
          disabled={!canManage || isPending}
        />
        {canManage ? (
          <Button
            type="button"
            onClick={onConnect}
            disabled={isPending || !url.trim()}
            className="w-full sm:w-auto"
          >
            {isPending ? "Reading signup…" : "Connect & Read Signup"}
          </Button>
        ) : (
          <p className="text-sm text-cos-muted">
            Ask an admin or president to connect the signup link.
          </p>
        )}
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <p className="flex items-start gap-2 text-left text-xs leading-relaxed text-cos-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Hey Ralli reads public assignment and availability totals only.
          Volunteer names and contact information are not imported.
        </p>
      </div>
    </section>
  );
}

function VolunteerConnectionReview({
  eventTitle,
  snapshot,
  source,
  canManage,
  isPending,
  error,
  onConfirm,
  onCancel,
  onTryAgain,
}: {
  eventTitle: string;
  snapshot: VolunteerSnapshotRecord | null;
  source: VolunteerSourceRecord;
  canManage: boolean;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onTryAgain: () => void;
}) {
  if (!snapshot) {
    return (
      <section className="rounded-xl border border-cos-border bg-white p-6">
        <p className="text-sm text-cos-muted">Reading signup…</p>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onTryAgain}>
            Try again
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </section>
    );
  }

  const dates = [
    ...new Set(
      snapshot.assignments.map((a) => a.date).filter(Boolean) as string[],
    ),
  ];
  const locations = [
    ...new Set(
      snapshot.assignments.map((a) => a.location).filter(Boolean) as string[],
    ),
  ];

  return (
    <section className="space-y-4 rounded-xl border border-cos-border bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
          Review detected data
        </p>
        <h2 className="mt-1 font-display text-2xl text-cos-text">
          We found volunteer assignments for {eventTitle}
        </h2>
        <p className="mt-1 text-sm text-cos-muted">
          Confirm to create the Volunteer Overview for this Event ID.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReviewStat
          label="Assignments"
          value={String(snapshot.summary.assignmentCount)}
        />
        <ReviewStat
          label="Total spots"
          value={
            snapshot.summary.totalSpots === null
              ? "Unknown"
              : String(snapshot.summary.totalSpots)
          }
        />
        <ReviewStat
          label="Filled"
          value={
            snapshot.summary.filledSpots === null
              ? "Unknown"
              : String(snapshot.summary.filledSpots)
          }
        />
        <ReviewStat
          label="Open"
          value={
            snapshot.summary.openSpots === null
              ? "Unknown"
              : String(snapshot.summary.openSpots)
          }
        />
      </ul>

      <div className="grid gap-3 text-sm text-cos-muted sm:grid-cols-2">
        <p>
          Dates detected:{" "}
          <span className="text-cos-text">
            {dates.length ? dates.join(", ") : "None"}
          </span>
        </p>
        <p>
          Locations detected:{" "}
          <span className="text-cos-text">
            {locations.length ? locations.join(", ") : "None"}
          </span>
        </p>
        {!snapshot.summary.quantitiesComplete ? (
          <p className="sm:col-span-2 text-amber-800">
            Some quantities could not be calculated reliably.
          </p>
        ) : null}
      </div>

      <div className="max-h-72 overflow-y-auto rounded-xl border border-cos-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-cos-bg text-xs uppercase tracking-wide text-cos-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Assignment</th>
              <th className="px-3 py-2 font-medium">Filled</th>
              <th className="px-3 py-2 font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.assignments.map((assignment) => (
              <tr
                key={assignment.externalKey}
                className="border-t border-cos-border/70"
              >
                <td className="px-3 py-2.5 text-cos-text">{assignment.name}</td>
                <td className="px-3 py-2.5">{filledLabel(assignment)}</td>
                <td className="px-3 py-2.5">
                  {assignment.quantityOpen ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Saving…" : "Confirm & Create Overview"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onTryAgain}
            disabled={isPending}
          >
            Try again
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-cos-muted">
        Source: {truncateUrl(source.sourceUrl)}
      </p>
    </section>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-xl border border-cos-border bg-cos-bg/40 px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-cos-text">{value}</p>
    </li>
  );
}

function VolunteerOverview({
  event,
  source,
  snapshot,
  ai,
  syncAttempts,
  canManage,
  isPending,
  error,
  filter,
  sort,
  selected,
  showReplace,
  showHistory,
  replaceUrl,
  copyNote,
  onFilterChange,
  onSortChange,
  onSelect,
  onRefresh,
  onDisconnect,
  onToggleReplace,
  onToggleHistory,
  onReplaceUrlChange,
  onReplace,
  onCopyUrl,
  onCopyMessage,
}: {
  event: Event;
  source: VolunteerSourceRecord;
  snapshot: VolunteerSnapshotRecord;
  ai: VolunteerAiSummary | null;
  syncAttempts: VolunteerSyncAttemptRecord[];
  canManage: boolean;
  isPending: boolean;
  error: string | null;
  filter: FilterId;
  sort: SortId;
  selected: VolunteerAssignmentView | null;
  showReplace: boolean;
  showHistory: boolean;
  replaceUrl: string;
  copyNote: string | null;
  onFilterChange: (value: FilterId) => void;
  onSortChange: (value: SortId) => void;
  onSelect: (assignment: VolunteerAssignmentView | null) => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  onToggleReplace: () => void;
  onToggleHistory: () => void;
  onReplaceUrlChange: (value: string) => void;
  onReplace: () => void;
  onCopyUrl: () => void;
  onCopyMessage: () => void;
}) {
  const summary = snapshot.summary;
  const needs = describeNeedsSnapshot(snapshot.assignments);
  const days = daysUntil(event.date);

  const rows = useMemo(() => {
    let list = [...snapshot.assignments];
    if (filter === "needs_help") {
      list = list.filter(
        (a) =>
          a.availabilityStatus === "needs_help" ||
          a.availabilityStatus === "high_need",
      );
    } else if (filter !== "all") {
      list = list.filter((a) => a.availabilityStatus === filter);
    }
    list.sort((a, b) => {
      switch (sort) {
        case "most_needed":
          return (b.quantityOpen ?? -1) - (a.quantityOpen ?? -1);
        case "least_filled":
          return (a.quantityFilled ?? 999) - (b.quantityFilled ?? 999);
        case "most_filled":
          return (b.quantityFilled ?? -1) - (a.quantityFilled ?? -1);
        case "date":
          return `${a.date ?? ""} ${a.startTime ?? ""}`.localeCompare(
            `${b.date ?? ""} ${b.startTime ?? ""}`,
          );
        case "name":
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [snapshot.assignments, filter, sort]);

  const campaignBuilderHref = `/events/${event.id}/campaign-builder`;

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-cos-border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-cos-muted">
              Last updated:{" "}
              {source.lastSuccessfulSyncAt
                ? formatSyncTime(source.lastSuccessfulSyncAt)
                : "Not yet synced"}
            </p>
            <h2 className="mt-1 font-display text-3xl text-cos-text">
              {event.title} – Volunteer Overview
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected to SignUpGenius
              </Badge>
              {source.syncStatus === "error" ? (
                <Badge variant="warning">Refresh failed</Badge>
              ) : null}
              {source.syncStatus === "syncing" || isPending ? (
                <Badge variant="info">Syncing…</Badge>
              ) : null}
            </div>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={isPending}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Stats
              </Button>
              <Button
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open SignUpGenius
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onToggleReplace}
              >
                <Link2 className="h-3.5 w-3.5" />
                Replace Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                disabled={isPending}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              href={source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open SignUpGenius
            </Button>
          )}
        </div>

        {ai?.staleNote || error ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {ai?.staleNote || error}
          </p>
        ) : null}

        {showReplace ? (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-cos-border bg-cos-bg/40 p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="New SignUpGenius URL"
                value={replaceUrl}
                onChange={(e) => onReplaceUrlChange(e.target.value)}
              />
            </div>
            <Button type="button" onClick={onReplace} disabled={isPending}>
              Connect & Read Signup
            </Button>
          </div>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Spots"
          value={summary.totalSpots === null ? "—" : String(summary.totalSpots)}
          hint={`Across ${summary.assignmentCount} assignments`}
        />
        <StatCard
          label="Filled"
          value={
            summary.filledSpots === null ? "—" : String(summary.filledSpots)
          }
          hint={
            summary.overallFilledPercent === null
              ? "Quantities incomplete"
              : `${summary.overallFilledPercent}% of all spots`
          }
        />
        <StatCard
          label="Open Spots"
          value={summary.openSpots === null ? "—" : String(summary.openSpots)}
          hint="Still need volunteers"
        />
        <StatCard
          label="Overall Filled"
          value={
            summary.overallFilledPercent === null
              ? "—"
              : `${summary.overallFilledPercent}%`
          }
          hint={
            summary.quantitiesComplete ? "From latest snapshot" : "Partial data"
          }
        />
        <StatCard
          label="Full Assignments"
          value={String(summary.fullAssignmentCount)}
          hint="Zero open spots"
        />
        <StatCard
          label="Assignments Needing Help"
          value={String(summary.needsHelpCount)}
          hint="High need + needs help"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-cos-border bg-white p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cos-muted" />
              <h3 className="font-display text-xl text-cos-text">AI Assistant</h3>
            </div>
            <p className="mt-3 text-sm font-medium text-cos-text">
              {ai?.headline}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-cos-muted">
              {(ai?.bullets ?? []).map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cos-border" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button href={campaignBuilderHref} size="sm">
                Create Reminder Post
              </Button>
              <Button href={campaignBuilderHref} variant="secondary" size="sm">
                Create Volunteer Email
              </Button>
              <Button href={campaignBuilderHref} variant="secondary" size="sm">
                Add Campaign Milestone
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCopyMessage}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Suggested Message
              </Button>
            </div>
            {copyNote ? (
              <p className="mt-2 text-xs text-emerald-700">{copyNote}</p>
            ) : null}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-cos-border bg-white p-5">
              <h3 className="font-display text-xl text-cos-text">
                Needs Snapshot
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {needs.map((item) => (
                  <li key={item.status} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(item.status)}`}
                    >
                      {item.label}
                    </span>
                    <span className="text-cos-muted">
                      {item.assignmentCount} assignment
                      {item.assignmentCount === 1 ? "" : "s"}
                      {item.status !== "full"
                        ? ` · ${item.openSpots} spot${item.openSpots === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {days !== null ? (
                <p className="mt-4 text-sm text-cos-text">
                  Event is in {days} day{days === 1 ? "" : "s"}
                  <span className="block text-cos-muted">
                    {formatEventWhen(event)}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-cos-border bg-white p-5">
              <h3 className="font-display text-xl text-cos-text">Quick Totals</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-cos-muted">Full assignments</dt>
                  <dd className="font-semibold text-cos-text">
                    {summary.fullAssignmentCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-cos-muted">Need help</dt>
                  <dd className="font-semibold text-cos-text">
                    {summary.needsHelpCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-cos-muted">Nearly full</dt>
                  <dd className="font-semibold text-cos-text">
                    {summary.nearlyFullCount}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="rounded-xl border border-cos-border bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-display text-xl text-cos-text">
                Volunteer Assignments
              </h3>
              <div className="flex flex-wrap gap-2">
                <Select
                  label="Filter"
                  value={filter}
                  onChange={(e) => onFilterChange(e.target.value as FilterId)}
                >
                  <option value="all">All</option>
                  <option value="needs_help">Needs Help</option>
                  <option value="nearly_full">Nearly Full</option>
                  <option value="full">Full</option>
                  <option value="unknown">Unknown</option>
                </Select>
                <Select
                  label="Sort"
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as SortId)}
                >
                  <option value="most_needed">Most Needed</option>
                  <option value="least_filled">Least Filled</option>
                  <option value="most_filled">Most Filled</option>
                  <option value="date">Date & Time</option>
                  <option value="name">Assignment Name</option>
                </Select>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-cos-border text-[11px] uppercase tracking-wide text-cos-muted">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Assignment / Shift</th>
                    <th className="pb-2 pr-3 font-medium">Date & Time</th>
                    <th className="pb-2 pr-3 font-medium">Filled</th>
                    <th className="pb-2 pr-3 font-medium">Open</th>
                    <th className="pb-2 pr-3 font-medium">Progress</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-cos-muted"
                      >
                        No assignments match this filter.
                      </td>
                    </tr>
                  ) : (
                    rows.map((assignment) => {
                      const pct = progressPercent(assignment);
                      return (
                        <tr
                          key={assignment.externalKey}
                          className="cursor-pointer border-b border-cos-border/70 hover:bg-cos-bg/50"
                          onClick={() => onSelect(assignment)}
                        >
                          <td className="py-3 pr-3">
                            <p className="font-medium text-cos-text">
                              {assignment.name}
                            </p>
                            {assignment.description ? (
                              <p className="mt-0.5 text-xs text-cos-muted">
                                {assignment.description}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-3 text-cos-muted">
                            {formatAssignmentWhen(assignment)}
                          </td>
                          <td className="py-3 pr-3">{filledLabel(assignment)}</td>
                          <td className="py-3 pr-3">
                            {assignment.quantityOpen ?? "—"}
                          </td>
                          <td className="py-3 pr-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-cos-bg">
                              <div
                                className="h-full rounded-full bg-emerald-600"
                                style={{ width: `${pct ?? 0}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(assignment.availabilityStatus)}`}
                            >
                              {availabilityStatusLabel(
                                assignment.availabilityStatus,
                              )}
                            </span>
                          </td>
                          <td className="py-3">
                            <ChevronRight className="h-4 w-4 text-cos-muted" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-cos-border bg-white p-5">
            <h3 className="font-display text-xl text-cos-text">Event Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail label="Event" value={event.title} />
              <Detail label="Date / Time" value={formatEventWhen(event)} />
              <Detail
                label="Location"
                value={event.location || snapshot.sourceLocation || "—"}
              />
              <Detail
                label="Signup deadline"
                value={
                  snapshot.signupDeadline
                    ? formatSyncTime(snapshot.signupDeadline)
                    : "—"
                }
              />
            </dl>
          </div>

          <div className="rounded-xl border border-cos-border bg-white p-5">
            <h3 className="font-display text-xl text-cos-text">Signup Source</h3>
            <p className="mt-3 text-sm text-cos-muted">Provider: SignUpGenius</p>
            <p className="mt-2 break-all text-sm text-cos-text">
              {truncateUrl(source.sourceUrl, 48)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCopyUrl}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy URL
              </Button>
              <Button
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="sm"
              >
                Open source
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-cos-border bg-white p-5">
            <h3 className="font-display text-xl text-cos-text">Sync Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail
                label="Sync status"
                value={
                  source.syncStatus === "success"
                    ? "Successful"
                    : source.syncStatus === "error"
                      ? "Failed"
                      : source.syncStatus
                }
              />
              <Detail
                label="Last read"
                value={
                  source.lastSyncAttemptAt
                    ? formatSyncTime(source.lastSyncAttemptAt)
                    : "—"
                }
              />
              <Detail
                label="Last successful"
                value={
                  source.lastSuccessfulSyncAt
                    ? formatSyncTime(source.lastSuccessfulSyncAt)
                    : "—"
                }
              />
              <Detail
                label="Last failed"
                value={
                  source.lastFailedSyncAt
                    ? formatSyncTime(source.lastFailedSyncAt)
                    : "—"
                }
              />
              <Detail
                label="Next scheduled"
                value={
                  source.nextScheduledSyncAt
                    ? formatSyncTime(source.nextScheduledSyncAt)
                    : "Not scheduled"
                }
              />
            </dl>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={onToggleHistory}
            >
              {showHistory ? "Hide Sync History" : "View Sync History"}
            </Button>
            {showHistory ? (
              <ul className="mt-3 space-y-2 text-xs text-cos-muted">
                {syncAttempts.length === 0 ? (
                  <li>No sync attempts yet.</li>
                ) : (
                  syncAttempts.map((attempt) => (
                    <li key={attempt.id}>
                      {formatSyncTime(attempt.startedAt)} · {attempt.status}
                      {attempt.errorMessage
                        ? ` · ${attempt.errorMessage}`
                        : ""}
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            <div className="flex gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>
                  Volunteers sign up through SignUpGenius. Hey Ralli displays
                  aggregate stats only.
                </p>
                <Button
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                >
                  Open SignUpGenius
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {selected ? (
        <AssignmentDetailsDrawer
          assignment={selected}
          capturedAt={snapshot.capturedAt}
          onClose={() => onSelect(null)}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-cos-border bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-cos-text">{value}</p>
      <p className="mt-1 text-xs text-cos-muted">{hint}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-cos-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-cos-text">{value}</dd>
    </div>
  );
}

function AssignmentDetailsDrawer({
  assignment,
  capturedAt,
  onClose,
}: {
  assignment: VolunteerAssignmentView;
  capturedAt: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto rounded-xl border border-cos-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              Assignment details
            </p>
            <h3 className="mt-1 font-display text-2xl text-cos-text">
              {assignment.name}
            </h3>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <Detail
            label="Description"
            value={assignment.description || "—"}
          />
          <Detail label="Date" value={assignment.date || "—"} />
          <Detail label="Start time" value={assignment.startTime || "—"} />
          <Detail label="End time" value={assignment.endTime || "—"} />
          <Detail label="Location" value={assignment.location || "—"} />
          <Detail
            label="Quantity requested"
            value={
              assignment.quantityRequested === null
                ? "—"
                : String(assignment.quantityRequested)
            }
          />
          <Detail
            label="Quantity filled"
            value={
              assignment.quantityFilled === null
                ? "—"
                : String(assignment.quantityFilled)
            }
          />
          <Detail
            label="Quantity open"
            value={
              assignment.quantityOpen === null
                ? "—"
                : String(assignment.quantityOpen)
            }
          />
          <Detail
            label="Status"
            value={availabilityStatusLabel(assignment.availabilityStatus)}
          />
          <Detail label="Source update time" value={formatSyncTime(capturedAt)} />
        </dl>
      </aside>
    </div>
  );
}
