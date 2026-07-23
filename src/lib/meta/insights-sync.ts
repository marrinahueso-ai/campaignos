import "server-only";

import { getOrganizationSchoolYearIds } from "@/lib/events/org-scope";
import {
  fetchFacebookPageDailyInsights,
  fetchFacebookPostInsights,
  fetchInstagramAccountDailyInsights,
  fetchInstagramMediaInsights,
} from "@/lib/meta/insights-graph";
import { isSkippableInsightsError } from "@/lib/meta/insights-metrics";
import { getMetaConnectionForOrganization } from "@/lib/meta-publishing/connection";
import { inspectMetaPageToken } from "@/lib/meta-publishing/connection-token-health";
import {
  hasFacebookInsightsScopes,
  hasInstagramInsightsScopes,
} from "@/lib/insights/scopes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PublishedSlot = {
  id: string;
  external_post_id: string;
  platform: "facebook" | "instagram";
  placement: "feed" | "story";
  milestone_title: string;
  published_at: string | null;
};

export type InsightsSyncResult = {
  ok: boolean;
  postsSynced: number;
  daysSynced: number;
  error: string | null;
  warnings: string[];
};

type PostSyncFailure = {
  externalPostId: string;
  platform: PublishedSlot["platform"];
  error: string;
  errorCode?: number;
};

function summarizeSyncOutcome(input: {
  warnings: string[];
  postsSynced: number;
  daysSynced: number;
  postFailures: PostSyncFailure[];
  totalPosts: number;
}): {
  ok: boolean;
  status: "completed" | "failed";
  userWarnings: string[];
  errorMessage: string | null;
} {
  const userWarnings = [...input.warnings];

  if (input.postFailures.length > 0) {
    const skippedCount = input.postFailures.length;
    if (skippedCount === input.totalPosts && input.totalPosts > 0) {
      userWarnings.push("Post metrics unavailable for all published posts.");
    } else {
      userWarnings.push(
        `Some post metrics unavailable (${skippedCount} of ${input.totalPosts} posts).`,
      );
    }
  }

  const hasData = input.postsSynced > 0 || input.daysSynced > 0;
  const ok = hasData || userWarnings.length === 0;

  return {
    ok,
    status: ok ? "completed" : "failed",
    userWarnings,
    errorMessage: ok ? null : userWarnings.join(" ") || "No metrics synced.",
  };
}

async function startSyncRun(input: {
  organizationId: string;
  syncType: "full" | "account_insights" | "post_insights" | "activity";
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("analytics_sync_runs")
    .insert({
      organization_id: input.organizationId,
      sync_type: input.syncType,
      status: "running",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to start analytics sync run:", error?.message);
    return null;
  }

  return data.id as string;
}

async function finishSyncRun(input: {
  runId: string | null;
  status: "completed" | "failed";
  postsSynced: number;
  daysSynced: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!input.runId) {
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("analytics_sync_runs")
    .update({
      status: input.status,
      completed_at: new Date().toISOString(),
      posts_synced: input.postsSynced,
      days_synced: input.daysSynced,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
    })
    .eq("id", input.runId);
}

async function fetchPublishedSlotsForOrganization(
  organizationId: string,
): Promise<PublishedSlot[]> {
  const supabase = await createClient();
  const schoolYearIds = await getOrganizationSchoolYearIds(organizationId);
  if (schoolYearIds.length === 0) {
    return [];
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id")
    .in("school_year_id", schoolYearIds);

  if (eventsError || !events?.length) {
    return [];
  }

  const eventIds = events.map((row) => row.id as string);
  const { data, error } = await supabase
    .from("meta_publication_slots")
    .select(
      "id, external_post_id, platform, placement, milestone_title, published_at",
    )
    .in("event_id", eventIds)
    .eq("status", "published")
    .not("external_post_id", "is", null);

  if (error) {
    console.error("Failed to fetch published slots for insights:", error.message);
    return [];
  }

  return (data ?? []) as PublishedSlot[];
}

async function upsertAccountInsights(input: {
  organizationId: string;
  platform: "facebook" | "instagram";
  rows: Awaited<ReturnType<typeof fetchFacebookPageDailyInsights>>["rows"];
}): Promise<number> {
  if (input.rows.length === 0) {
    return 0;
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const payload = input.rows.map((row) => ({
    organization_id: input.organizationId,
    platform: input.platform,
    metric_date: row.date,
    reach: row.reach,
    engagement: row.engagement,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    clicks: row.clicks,
    // Persist derived views so Insights can read totals without a schema migration.
    raw_metrics: {
      ...row.rawMetrics,
      views: row.views,
    },
    synced_at: now,
    updated_at: now,
  }));

  const { error } = await admin.from("social_account_insights").upsert(payload, {
    onConflict: "organization_id,platform,metric_date",
  });

  if (error) {
    console.error("Failed to upsert account insights:", error.message);
    return 0;
  }

  return payload.length;
}

async function upsertPostInsight(input: {
  organizationId: string;
  slot: PublishedSlot;
  insight: {
    views: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    rawMetrics: Record<string, number>;
  };
}): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("social_post_insights").upsert(
    {
      organization_id: input.organizationId,
      meta_publication_slot_id: input.slot.id,
      external_post_id: input.slot.external_post_id,
      platform: input.slot.platform,
      placement: input.slot.placement,
      post_title: input.slot.milestone_title,
      published_at: input.slot.published_at,
      reach: input.insight.reach,
      engagement: input.insight.engagement,
      likes: input.insight.likes,
      comments: input.insight.comments,
      shares: input.insight.shares,
      clicks: input.insight.clicks,
      raw_metrics: {
        ...input.insight.rawMetrics,
        views: input.insight.views,
      },
      synced_at: now,
      updated_at: now,
    },
    { onConflict: "organization_id,external_post_id" },
  );

  if (error) {
    console.error("Failed to upsert post insight:", error.message);
    return false;
  }

  return true;
}

async function backfillActivityFromInbox(organizationId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inbox_messages")
    .select("id, channel_type, body, sender_name, sent_at, direction, thread_id")
    .eq("organization_id", organizationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error || !data?.length) {
    return 0;
  }

  const threadIds = [...new Set(data.map((row) => row.thread_id as string).filter(Boolean))];
  const threadMap = new Map<string, { subject: string | null; external_post_id: string | null }>();

  if (threadIds.length > 0) {
    const { data: threads } = await admin
      .from("inbox_threads")
      .select("id, subject, external_post_id")
      .in("id", threadIds);

    for (const thread of threads ?? []) {
      threadMap.set(thread.id as string, {
        subject: (thread.subject as string | null) ?? null,
        external_post_id: (thread.external_post_id as string | null) ?? null,
      });
    }
  }

  let inserted = 0;
  for (const row of data) {
    const channelType = row.channel_type as string;
    const platform = channelType.startsWith("instagram") ? "instagram" : "facebook";
    const eventType = channelType.includes("comment")
      ? "comment"
      : channelType.includes("message")
        ? "message"
        : "activity";

    const thread = threadMap.get(row.thread_id as string);

    const title =
      eventType === "comment"
        ? `New comment${thread?.subject ? ` on "${thread.subject}"` : ""}`
        : eventType === "message"
          ? `New ${platform === "instagram" ? "Instagram" : "Facebook"} message`
          : `New ${platform} activity`;

    const { data: existing } = await admin
      .from("social_activity_events")
      .select("id")
      .eq("inbox_message_id", row.id as string)
      .maybeSingle();

    if (existing) {
      continue;
    }

    const { error: insertError } = await admin.from("social_activity_events").insert({
      organization_id: organizationId,
      platform,
      event_type: eventType,
      title,
      body: (row.body as string | null) ?? null,
      external_post_id: thread?.external_post_id ?? null,
      actor_name: (row.sender_name as string | null) ?? null,
      occurred_at: (row.sent_at as string | null) ?? new Date().toISOString(),
      source: "inbox",
      inbox_message_id: row.id as string,
    });

    if (!insertError) {
      inserted += 1;
    }
  }

  return inserted;
}

export async function syncOrganizationInsights(input: {
  organizationId: string;
  since?: string;
  until?: string;
}): Promise<InsightsSyncResult> {
  const warnings: string[] = [];
  const connection = await getMetaConnectionForOrganization(input.organizationId);

  if (!connection?.pageAccessToken || !connection.facebookPageId) {
    return {
      ok: false,
      postsSynced: 0,
      daysSynced: 0,
      error: "Meta is not connected for this organization.",
      warnings,
    };
  }

  const tokenHealth = await inspectMetaPageToken(connection.pageAccessToken);
  if (!tokenHealth.tokenValid) {
    return {
      ok: false,
      postsSynced: 0,
      daysSynced: 0,
      error: "Meta token is invalid or expired. Reconnect to continue syncing insights.",
      warnings,
    };
  }

  const runId = await startSyncRun({
    organizationId: input.organizationId,
    syncType: "full",
  });

  const untilDate = input.until ?? new Date().toISOString().slice(0, 10);
  const sinceDate =
    input.since ??
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let daysSynced = 0;
  let postsSynced = 0;

  try {
    if (hasFacebookInsightsScopes(tokenHealth.grantedScopes)) {
      const facebook = await fetchFacebookPageDailyInsights({
        pageId: connection.facebookPageId,
        accessToken: connection.pageAccessToken,
        since: sinceDate,
        until: untilDate,
      });

      if (facebook.error) {
        warnings.push(`Facebook account insights: ${facebook.error}`);
      } else {
        daysSynced += await upsertAccountInsights({
          organizationId: input.organizationId,
          platform: "facebook",
          rows: facebook.rows,
        });
      }
    } else {
      warnings.push(
        "Missing read_insights scope — reconnect Meta to sync Facebook account metrics.",
      );
    }

    if (
      connection.instagramAccountId &&
      hasInstagramInsightsScopes(tokenHealth.grantedScopes)
    ) {
      const instagram = await fetchInstagramAccountDailyInsights({
        instagramAccountId: connection.instagramAccountId,
        accessToken: connection.pageAccessToken,
        since: sinceDate,
        until: untilDate,
      });

      if (instagram.error) {
        warnings.push(`Instagram account insights: ${instagram.error}`);
      } else {
        daysSynced += await upsertAccountInsights({
          organizationId: input.organizationId,
          platform: "instagram",
          rows: instagram.rows,
        });
      }
    } else if (connection.instagramAccountId) {
      warnings.push(
        "Missing instagram_manage_insights scope — reconnect Meta to sync Instagram account metrics.",
      );
    }

    const slots = await fetchPublishedSlotsForOrganization(input.organizationId);
    const postFailures: PostSyncFailure[] = [];

    for (const slot of slots) {
      const fetchResult =
        slot.platform === "facebook"
          ? await fetchFacebookPostInsights({
              postId: slot.external_post_id,
              accessToken: connection.pageAccessToken,
              placement: slot.placement,
            })
          : await fetchInstagramMediaInsights({
              mediaId: slot.external_post_id,
              accessToken: connection.pageAccessToken,
              placement: slot.placement,
            });

      if (slot.platform === "facebook") {
        const facebookResult = fetchResult as Awaited<
          ReturnType<typeof fetchFacebookPostInsights>
        >;
        if (facebookResult.skipped) {
          console.info("Insights sync skipped post:", {
            externalPostId: slot.external_post_id,
            platform: slot.platform,
            reason: facebookResult.skipReason,
          });
          continue;
        }
      }

      if (fetchResult.error) {
        postFailures.push({
          externalPostId: slot.external_post_id,
          platform: slot.platform,
          error: fetchResult.error,
          errorCode: fetchResult.errorCode,
        });
        console.warn("Insights sync post metrics unavailable:", {
          externalPostId: slot.external_post_id,
          platform: slot.platform,
          placement: slot.placement,
          error: fetchResult.error,
          errorCode: fetchResult.errorCode,
          skippable: isSkippableInsightsError(fetchResult.errorCode),
        });
        continue;
      }

      if (!fetchResult.insight) {
        continue;
      }

      const saved = await upsertPostInsight({
        organizationId: input.organizationId,
        slot,
        insight: fetchResult.insight,
      });

      if (saved) {
        postsSynced += 1;
      }
    }

    await backfillActivityFromInbox(input.organizationId);

    const outcome = summarizeSyncOutcome({
      warnings,
      postsSynced,
      daysSynced,
      postFailures,
      totalPosts: slots.length,
    });

    await finishSyncRun({
      runId,
      status: outcome.status,
      postsSynced,
      daysSynced,
      errorMessage: outcome.errorMessage,
      metadata: {
        warnings: outcome.userWarnings,
        postErrors: postFailures,
      },
    });

    return {
      ok: outcome.ok,
      postsSynced,
      daysSynced,
      error: outcome.errorMessage,
      warnings: outcome.userWarnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insights sync failed.";
    await finishSyncRun({
      runId,
      status: "failed",
      postsSynced,
      daysSynced,
      errorMessage: message,
    });

    return {
      ok: false,
      postsSynced,
      daysSynced,
      error: message,
      warnings,
    };
  }
}
