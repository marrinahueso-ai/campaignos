"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth/queries";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getEventById } from "@/lib/events/queries";
import {
  filterAssignmentsByDateAllowlist,
  normalizeDateAllowlist,
} from "@/lib/event-volunteers/assignment-list";
import { buildSnapshotFromAssignments } from "@/lib/event-volunteers/stats";
import { canManageVolunteerStats } from "@/lib/event-volunteers/permissions";
import {
  confirmVolunteerSnapshot,
  beginVolunteerSync,
  disconnectVolunteerSource,
  markVolunteerSyncFailed,
  persistVolunteerSnapshot,
  upsertVolunteerSource,
  writeVolunteerActivityLog,
} from "@/lib/event-volunteers/mutations";
import {
  getActiveVolunteerSourceForEvent,
  getLatestConfirmedVolunteerSnapshot,
  getPendingVolunteerSnapshot,
  getPreviousConfirmedSnapshotSummary,
  getVolunteerSnapshotById,
  listVolunteerSyncAttempts,
} from "@/lib/event-volunteers/queries";
import { readSignUpGeniusSignup } from "@/lib/event-volunteers/signupgenius-reader";
import { validateSignUpGeniusUrl } from "@/lib/event-volunteers/url";
import { buildVolunteerAiSummary } from "@/lib/event-volunteers/ai-summary";
import type { AssignmentDateAllowlist } from "@/lib/event-volunteers/assignment-list";

const STALE_MS = 30 * 60 * 1000;

async function requireVolunteerContext(eventId: string) {
  const [user, organization, role, event] = await Promise.all([
    getAuthUser(),
    getCurrentOrganization(),
    getCurrentCampaignRole(),
    getEventById(eventId),
  ]);

  if (!user) {
    return { error: "Sign in to manage volunteer stats." as const };
  }
  if (!organization) {
    return { error: "No active organization." as const };
  }
  if (!event) {
    return { error: "Event not found." as const };
  }

  return { user, organization, role, event };
}

export async function getEventVolunteerOverviewAction(eventId: string) {
  const ctx = await requireVolunteerContext(eventId);
  if ("error" in ctx) {
    return { success: false as const, error: ctx.error };
  }

  const { organization, role, event } = ctx;
  const canManage = canManageVolunteerStats(role);
  const source = await getActiveVolunteerSourceForEvent(
    event.id,
    organization.id,
  );

  if (!source) {
    return {
      success: true as const,
      state: "empty" as const,
      canManage,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
      },
    };
  }

  if (source.status === "pending_review") {
    const pending = await getPendingVolunteerSnapshot(
      source.id,
      organization.id,
    );
    return {
      success: true as const,
      state: "review" as const,
      canManage,
      source,
      snapshot: pending,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
      },
    };
  }

  let snapshot = await getLatestConfirmedVolunteerSnapshot(
    event.id,
    organization.id,
  );

  // Auto-refresh when tab loads and snapshot is older than 30 minutes.
  const lastSuccess = source.lastSuccessfulSyncAt
    ? new Date(source.lastSuccessfulSyncAt).getTime()
    : 0;
  const isStale = !lastSuccess || Date.now() - lastSuccess > STALE_MS;
  let autoRefreshAttempted = false;
  let autoRefreshError: string | null = null;

  if (canManage && isStale && source.syncStatus !== "syncing") {
    autoRefreshAttempted = true;
    const refresh = await refreshVolunteerStatsInternal({
      eventId: event.id,
      organizationId: organization.id,
      userId: ctx.user.id,
      sourceId: source.id,
      sourceUrl: source.sourceUrl,
      eventDate: event.date,
      confirmed: true,
    });
    if ("error" in refresh) {
      autoRefreshError = refresh.error;
    } else {
      snapshot =
        (await getLatestConfirmedVolunteerSnapshot(event.id, organization.id)) ??
        snapshot;
    }
  }

  const previous = snapshot
    ? await getPreviousConfirmedSnapshotSummary(
        event.id,
        organization.id,
        snapshot.id,
      )
    : null;

  const syncAttempts = await listVolunteerSyncAttempts(
    source.id,
    organization.id,
    8,
  );

  const refreshedSource =
    (await getActiveVolunteerSourceForEvent(event.id, organization.id)) ??
    source;

  const ai = snapshot
    ? buildVolunteerAiSummary({
        summary: snapshot.summary,
        assignments: snapshot.assignments,
        lastSuccessfulSyncAt: refreshedSource.lastSuccessfulSyncAt,
        syncFailed:
          refreshedSource.syncStatus === "error" || Boolean(autoRefreshError),
        previousSummary: previous,
      })
    : null;

  return {
    success: true as const,
    state: "overview" as const,
    canManage,
    source: refreshedSource,
    snapshot,
    syncAttempts,
    ai,
    autoRefreshError,
    event: {
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
    },
  };
}

async function refreshVolunteerStatsInternal(input: {
  eventId: string;
  organizationId: string;
  userId: string;
  sourceId: string;
  sourceUrl: string;
  eventDate: string | null;
  confirmed: boolean;
  /** Sticky allowlist; omitted → load from source (null = all dates). */
  includedAssignmentDates?: AssignmentDateAllowlist;
}): Promise<{ snapshotId: string } | { error: string }> {
  const begin = await beginVolunteerSync(input.sourceId);
  if ("error" in begin) {
    return begin;
  }

  let allowlist: AssignmentDateAllowlist =
    input.includedAssignmentDates === undefined
      ? null
      : input.includedAssignmentDates;

  if (input.includedAssignmentDates === undefined) {
    const source = await getActiveVolunteerSourceForEvent(
      input.eventId,
      input.organizationId,
    );
    if (source?.id === input.sourceId) {
      allowlist = source.includedAssignmentDates;
    }
  }

  const read = await readSignUpGeniusSignup(input.sourceUrl);
  if (!read.ok) {
    await markVolunteerSyncFailed({
      sourceId: input.sourceId,
      eventId: input.eventId,
      organizationId: input.organizationId,
      errorMessage: read.error,
    });
    return { error: read.error };
  }

  if (read.snapshot.assignments.length === 0) {
    await markVolunteerSyncFailed({
      sourceId: input.sourceId,
      eventId: input.eventId,
      organizationId: input.organizationId,
      errorMessage: "No assignments found.",
    });
    return { error: "No assignments found." };
  }

  const scopedAssignments = filterAssignmentsByDateAllowlist(
    read.snapshot.assignments,
    allowlist,
  );

  if (scopedAssignments.length === 0) {
    const message =
      allowlist == null
        ? "No assignments found."
        : "No assignments found for the dates included in this event.";
    await markVolunteerSyncFailed({
      sourceId: input.sourceId,
      eventId: input.eventId,
      organizationId: input.organizationId,
      errorMessage: message,
    });
    return { error: message };
  }

  const rebuilt = buildSnapshotFromAssignments({
    ...read.snapshot,
    assignments: scopedAssignments,
  });

  const persisted = await persistVolunteerSnapshot({
    eventId: input.eventId,
    organizationId: input.organizationId,
    sourceId: input.sourceId,
    snapshot: rebuilt.snapshot,
    summary: rebuilt.summary,
    confirmed: input.confirmed,
    eventDate: input.eventDate,
  });

  if ("error" in persisted) {
    await markVolunteerSyncFailed({
      sourceId: input.sourceId,
      eventId: input.eventId,
      organizationId: input.organizationId,
      errorMessage: persisted.error,
    });
    return persisted;
  }

  return persisted;
}

export async function connectVolunteerSourceAction(input: {
  eventId: string;
  sourceUrl: string;
}) {
  const ctx = await requireVolunteerContext(input.eventId);
  if ("error" in ctx) {
    return { success: false as const, error: ctx.error };
  }
  if (!canManageVolunteerStats(ctx.role)) {
    return {
      success: false as const,
      error: "You do not have permission to connect volunteer signups.",
    };
  }

  const validated = validateSignUpGeniusUrl(input.sourceUrl);
  if ("error" in validated) {
    return { success: false as const, error: validated.error };
  }

  const source = await upsertVolunteerSource({
    eventId: ctx.event.id,
    organizationId: ctx.organization.id,
    sourceUrl: validated.normalizedHref,
    sourceUrlNormalized: validated.normalizedHref,
    userId: ctx.user.id,
    status: "pending_review",
  });
  if ("error" in source) {
    return { success: false as const, error: source.error };
  }

  // Review import reads the full link; sticky allowlist is chosen on confirm.
  const synced = await refreshVolunteerStatsInternal({
    eventId: ctx.event.id,
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    sourceId: source.id,
    sourceUrl: validated.normalizedHref,
    eventDate: ctx.event.date,
    confirmed: false,
    includedAssignmentDates: null,
  });

  if ("error" in synced) {
    await writeVolunteerActivityLog({
      organizationId: ctx.organization.id,
      eventId: ctx.event.id,
      sourceId: source.id,
      actorUserId: ctx.user.id,
      action: "connect_failed",
      details: { error: synced.error },
    });
    return { success: false as const, error: synced.error };
  }

  await writeVolunteerActivityLog({
    organizationId: ctx.organization.id,
    eventId: ctx.event.id,
    sourceId: source.id,
    actorUserId: ctx.user.id,
    action: "connect",
    details: { url: validated.normalizedHref, snapshotId: synced.snapshotId },
  });

  revalidatePath(`/events/${ctx.event.id}`);
  const pending = await getVolunteerSnapshotById(
    synced.snapshotId,
    ctx.organization.id,
  );

  return {
    success: true as const,
    sourceId: source.id,
    snapshot: pending,
  };
}

export async function confirmVolunteerOverviewAction(input: {
  eventId: string;
  sourceId: string;
  snapshotId: string;
  includedAssignmentDates: string[];
}) {
  const ctx = await requireVolunteerContext(input.eventId);
  if ("error" in ctx) {
    return { success: false as const, error: ctx.error };
  }
  if (!canManageVolunteerStats(ctx.role)) {
    return {
      success: false as const,
      error: "You do not have permission to confirm volunteer stats.",
    };
  }

  const normalized = normalizeDateAllowlist(input.includedAssignmentDates);
  if (!normalized.ok) {
    return { success: false as const, error: normalized.error };
  }

  const result = await confirmVolunteerSnapshot({
    sourceId: input.sourceId,
    snapshotId: input.snapshotId,
    organizationId: ctx.organization.id,
    includedAssignmentDates: normalized.dates,
  });
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  await writeVolunteerActivityLog({
    organizationId: ctx.organization.id,
    eventId: ctx.event.id,
    sourceId: input.sourceId,
    actorUserId: ctx.user.id,
    action: "confirm",
    details: {
      snapshotId: input.snapshotId,
      includedAssignmentDates: normalized.dates,
    },
  });

  revalidatePath(`/events/${ctx.event.id}`);
  return { success: true as const };
}

export async function refreshVolunteerStatsAction(input: { eventId: string }) {
  const ctx = await requireVolunteerContext(input.eventId);
  if ("error" in ctx) {
    return { success: false as const, error: ctx.error };
  }
  if (!canManageVolunteerStats(ctx.role)) {
    return {
      success: false as const,
      error: "You do not have permission to refresh volunteer stats.",
    };
  }

  const source = await getActiveVolunteerSourceForEvent(
    ctx.event.id,
    ctx.organization.id,
  );
  if (!source) {
    return { success: false as const, error: "No signup is connected." };
  }

  const synced = await refreshVolunteerStatsInternal({
    eventId: ctx.event.id,
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    sourceId: source.id,
    sourceUrl: source.sourceUrl,
    eventDate: ctx.event.date,
    confirmed: source.status === "connected",
  });

  if ("error" in synced) {
    await writeVolunteerActivityLog({
      organizationId: ctx.organization.id,
      eventId: ctx.event.id,
      sourceId: source.id,
      actorUserId: ctx.user.id,
      action: "refresh_failed",
      details: { error: synced.error },
    });
    // Keep last successful snapshot visible.
    revalidatePath(`/events/${ctx.event.id}`);
    return { success: false as const, error: synced.error };
  }

  await writeVolunteerActivityLog({
    organizationId: ctx.organization.id,
    eventId: ctx.event.id,
    sourceId: source.id,
    actorUserId: ctx.user.id,
    action: "refresh",
    details: { snapshotId: synced.snapshotId },
  });

  revalidatePath(`/events/${ctx.event.id}`);
  return { success: true as const, snapshotId: synced.snapshotId };
}

export async function replaceVolunteerSourceAction(input: {
  eventId: string;
  sourceUrl: string;
}) {
  const ctx = await requireVolunteerContext(input.eventId);
  if ("error" in ctx) {
    return { success: false as const, error: ctx.error };
  }
  if (!canManageVolunteerStats(ctx.role)) {
    return {
      success: false as const,
      error: "You do not have permission to replace the signup link.",
    };
  }

  const existing = await getActiveVolunteerSourceForEvent(
    ctx.event.id,
    ctx.organization.id,
  );
  if (existing) {
    await disconnectVolunteerSource({
      sourceId: existing.id,
      organizationId: ctx.organization.id,
    });
    await writeVolunteerActivityLog({
      organizationId: ctx.organization.id,
      eventId: ctx.event.id,
      sourceId: existing.id,
      actorUserId: ctx.user.id,
      action: "replace_disconnect",
    });
  }

  const connected = await connectVolunteerSourceAction({
    eventId: input.eventId,
    sourceUrl: input.sourceUrl,
  });

  if (connected.success) {
    await writeVolunteerActivityLog({
      organizationId: ctx.organization.id,
      eventId: ctx.event.id,
      sourceId: connected.sourceId,
      actorUserId: ctx.user.id,
      action: "replace",
    });
  }

  return connected;
}

export async function disconnectVolunteerSourceAction(input: {
  eventId: string;
}) {
  const ctx = await requireVolunteerContext(input.eventId);
  if ("error" in ctx) {
    return { success: false as const, error: ctx.error };
  }
  if (!canManageVolunteerStats(ctx.role)) {
    return {
      success: false as const,
      error: "You do not have permission to disconnect volunteer signups.",
    };
  }

  const source = await getActiveVolunteerSourceForEvent(
    ctx.event.id,
    ctx.organization.id,
  );
  if (!source) {
    return { success: false as const, error: "No signup is connected." };
  }

  const result = await disconnectVolunteerSource({
    sourceId: source.id,
    organizationId: ctx.organization.id,
  });
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  await writeVolunteerActivityLog({
    organizationId: ctx.organization.id,
    eventId: ctx.event.id,
    sourceId: source.id,
    actorUserId: ctx.user.id,
    action: "disconnect",
  });

  revalidatePath(`/events/${ctx.event.id}`);
  return { success: true as const };
}

export async function cancelVolunteerReviewAction(input: {
  eventId: string;
}) {
  return disconnectVolunteerSourceAction(input);
}
