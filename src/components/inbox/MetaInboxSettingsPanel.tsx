"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  refreshMetaTokenScopesAction,
  syncInboxNowAction,
  subscribeInboxWebhooksAction,
} from "@/lib/inbox/actions";
import { buildMetaOAuthStartPath } from "@/lib/integrations/oauth";
import {
  META_COMBINED_OAUTH_SCOPE_LIST,
  META_INBOX_OAUTH_SCOPE_LIST,
} from "@/lib/meta-publishing/oauth-scopes";
import type { InboxConnectionStatus } from "@/lib/inbox/types";

interface MetaInboxSettingsPanelProps {
  connection: InboxConnectionStatus;
  /** Collapsed troubleshooting UI for Settings → Meta. */
  compact?: boolean;
}

function ScopeBadge({ scope, granted }: { scope: string; granted: boolean }) {
  return (
    <code
      className={
        granted
          ? "mr-1 rounded bg-emerald-100 px-1 text-emerald-900"
          : "mr-1 rounded bg-amber-100 px-1 text-amber-900"
      }
    >
      {scope}
      {granted ? " ✓" : " ✗"}
    </code>
  );
}

export function MetaInboxSettingsPanel({
  connection,
  compact = false,
}: MetaInboxSettingsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [liveScopes, setLiveScopes] = useState<string[] | null>(null);
  const [isSyncing, startSyncTransition] = useTransition();
  const [isSubscribing, startSubscribeTransition] = useTransition();
  const [isRefreshingScopes, startRefreshScopesTransition] = useTransition();

  const reconnectHref = buildMetaOAuthStartPath({
    returnTo: "/settings/meta",
    pageId: connection.facebookPageId,
    authType: "rerequest",
  });

  function handleRefreshScopes() {
    setError(null);
    setMessage(null);
    startRefreshScopesTransition(async () => {
      const result = await refreshMetaTokenScopesAction();
      if (!result.success) {
        setError(result.error ?? "Could not refresh permissions.");
        return;
      }

      setLiveScopes(result.grantedScopes ?? []);
      if (result.missingFacebookCommentReplyScopes?.length) {
        setMessage(
          "Comment replies may need a reconnect. Publishing and inbox still work.",
        );
      } else {
        setMessage("Permissions look good.");
      }
      router.refresh();
    });
  }

  function handleSubscribeWebhooks() {
    setError(null);
    setMessage(null);
    startSubscribeTransition(async () => {
      const result = await subscribeInboxWebhooksAction();
      if (!result.success) {
        setError(result.error ?? "Could not refresh message delivery.");
        return;
      }

      setMessage("Message delivery refreshed.");
      router.refresh();
    });
  }

  function handleSyncNow() {
    setError(null);
    setMessage(null);
    startSyncTransition(async () => {
      const result = await syncInboxNowAction();
      if (!result.success) {
        setError(result.error ?? "Inbox sync failed.");
        return;
      }

      const threadCount = result.threadsUpserted ?? 0;
      const messageCount = result.messagesUpserted ?? 0;
      const syncSummary = `Synced ${threadCount} conversation${threadCount === 1 ? "" : "s"}, ${messageCount} message${messageCount === 1 ? "" : "s"}.`;
      setMessage(result.warning ? `${syncSummary} ${result.warning}` : syncSummary);
      router.refresh();
    });
  }

  if (!connection.metaConnected && !connection.metaConfiguredViaEnv) {
    return (
      <p className="text-sm text-cos-muted">
        Connect Facebook above first — inbox uses the same connection.
      </p>
    );
  }

  const displayedScopes = liveScopes ?? connection.grantedScopes;
  const healthy =
    connection.messagingReady &&
    !connection.metaReconnectRequired &&
    connection.metaTokenValid;

  if (compact) {
    return (
      <div className="space-y-4">
        {connection.metaReconnectRequired ? (
          <div className="space-y-3">
            <p className="text-sm text-cos-muted">
              Sign in with Facebook again to restore inbox and publishing.
            </p>
            <Button href={reconnectHref} size="sm">
              Reconnect with Facebook
            </Button>
          </div>
        ) : null}

        {!connection.messagingReady && !connection.metaReconnectRequired ? (
          <div className="space-y-3">
            <p className="text-sm text-cos-muted">
              Inbox needs one more approval from Facebook. Reconnect and accept the list it shows.
            </p>
            <Button href={reconnectHref} size="sm">
              Approve inbox access
            </Button>
          </div>
        ) : null}

        {healthy ? (
          <p className="text-sm text-cos-muted">
            Inbox is working. New messages arrive on their own.
            {connection.lastSyncedAt
              ? ` Last updated ${new Date(connection.lastSyncedAt).toLocaleString()}.`
              : null}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSyncing}
            onClick={handleSyncNow}
          >
            {isSyncing ? "Syncing…" : "Sync inbox now"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubscribing}
            onClick={handleSubscribeWebhooks}
          >
            {isSubscribing ? "Refreshing…" : "Refresh delivery"}
          </Button>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-cos-muted hover:text-cos-text">
            Technical details
          </summary>
          <div className="mt-3 space-y-3 text-cos-muted">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isRefreshingScopes}
              onClick={handleRefreshScopes}
            >
              {isRefreshingScopes ? "Checking…" : "Check permissions"}
            </Button>
            <p>
              Inbox permissions:{" "}
              {META_INBOX_OAUTH_SCOPE_LIST.map((scope) => (
                <ScopeBadge
                  key={scope}
                  scope={scope}
                  granted={displayedScopes.includes(scope)}
                />
              ))}
            </p>
            {connection.lastSyncError ? (
              <p className="text-red-600" role="alert">
                Last sync error: {connection.lastSyncError}
              </p>
            ) : null}
          </div>
        </details>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </div>
    );
  }

  // Non-compact (legacy / other embeds): still calmer than before
  return (
    <div className="space-y-5">
      {connection.metaReconnectRequired ? (
        <div className="space-y-3">
          <p className="text-sm text-cos-muted">
            Sign in with Facebook again to restore inbox and publishing.
          </p>
          <Button href={reconnectHref} size="sm">
            Reconnect with Facebook
          </Button>
        </div>
      ) : null}

      <p className="text-sm text-cos-muted">
        {connection.messagingReady
          ? "Inbox is working. New messages arrive on their own."
          : "Reconnect above and approve inbox access if DMs or comments are missing."}
        {connection.lastSyncedAt
          ? ` Last updated ${new Date(connection.lastSyncedAt).toLocaleString()}.`
          : null}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSyncing}
          onClick={handleSyncNow}
        >
          {isSyncing ? "Syncing…" : "Sync inbox now"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isSubscribing}
          onClick={handleSubscribeWebhooks}
        >
          {isSubscribing ? "Refreshing…" : "Refresh delivery"}
        </Button>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-cos-muted hover:text-cos-text">
          Technical details
        </summary>
        <div className="mt-3 space-y-3 text-cos-muted">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRefreshingScopes}
            onClick={handleRefreshScopes}
          >
            {isRefreshingScopes ? "Checking…" : "Check permissions"}
          </Button>
          <p>
            All scopes on connect:{" "}
            {META_COMBINED_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          <p>
            Inbox:{" "}
            {META_INBOX_OAUTH_SCOPE_LIST.map((scope) => (
              <ScopeBadge
                key={scope}
                scope={scope}
                granted={displayedScopes.includes(scope)}
              />
            ))}
          </p>
        </div>
      </details>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
