"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  refreshMetaTokenScopesAction,
  syncInboxNowAction,
  subscribeInboxWebhooksAction,
} from "@/lib/inbox/actions";
import {
  META_COMBINED_OAUTH_SCOPE_LIST,
  META_INBOX_OAUTH_SCOPE_LIST,
} from "@/lib/meta-publishing/oauth-scopes";
import type { InboxConnectionStatus } from "@/lib/inbox/types";

interface MetaInboxSettingsPanelProps {
  connection: InboxConnectionStatus;
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

export function MetaInboxSettingsPanel({ connection }: MetaInboxSettingsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [liveScopes, setLiveScopes] = useState<string[] | null>(null);
  const [isSyncing, startSyncTransition] = useTransition();
  const [isSubscribing, startSubscribeTransition] = useTransition();
  const [isRefreshingScopes, startRefreshScopesTransition] = useTransition();

  const reconnectParams = new URLSearchParams({ returnTo: "/settings/meta" });
  if (connection.facebookPageId) {
    reconnectParams.set("pageId", connection.facebookPageId);
  }
  const reconnectHref = `/api/meta/oauth/start?${reconnectParams.toString()}`;

  const showCommentReplyNote =
    connection.metaConnected &&
    !connection.metaConfiguredViaEnv &&
    !connection.facebookCommentReplyReady &&
    connection.metaTokenValid;

  function handleRefreshScopes() {
    setError(null);
    setMessage(null);
    startRefreshScopesTransition(async () => {
      const result = await refreshMetaTokenScopesAction();
      if (!result.success) {
        setError(result.error ?? "Could not refresh token scopes.");
        return;
      }

      setLiveScopes(result.grantedScopes ?? []);
      if (result.missingFacebookCommentReplyScopes?.length) {
        setMessage(
          "Live token check: pages_manage_engagement is not on this Page token. Publishing and inbox sync still work; reconnect only if you need Facebook comment replies.",
        );
      } else {
        setMessage("Token scopes refreshed — pages_manage_engagement is present.");
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
        setError(result.error ?? "Webhook subscribe failed.");
        return;
      }

      setMessage("Page webhook subscriptions refreshed (messages, standby, comments).");
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
      const syncSummary = `Sync complete — ${threadCount} thread${threadCount === 1 ? "" : "s"}, ${messageCount} message${messageCount === 1 ? "" : "s"}.`;
      setMessage(result.warning ? `${syncSummary} ${result.warning}` : syncSummary);
      router.refresh();
    });
  }

  if (!connection.metaConnected && !connection.metaConfiguredViaEnv) {
    return (
      <p className="text-sm text-cos-muted">
        Connect Meta above first. Inbox uses the same Facebook OAuth connection — no separate
        authorization step.
      </p>
    );
  }

  const displayedScopes = liveScopes ?? connection.grantedScopes;

  return (
    <div className="space-y-5">
      {connection.metaReconnectRequired ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-medium">Meta token expired</p>
          <p className="mt-2">
            Your Facebook Page token is no longer valid. Reconnect once in the Connect Meta section
            above — inbox and publishing resume automatically.
          </p>
          <div className="mt-4">
            <Button href={reconnectHref} size="sm">
              Reconnect with Facebook
            </Button>
          </div>
        </div>
      ) : null}

      {showCommentReplyNote ? (
        <div className="rounded-xl border border-cos-border bg-cos-bg/40 px-4 py-4 text-sm text-cos-muted">
          <p className="font-medium text-cos-text">Facebook comment replies optional</p>
          <p className="mt-2">
            Your connection is active for publishing and inbox sync. Comment replies need{" "}
            <code className="rounded bg-cos-bg px-1">pages_manage_engagement</code> — reconnect
            only if you want that feature.
          </p>
        </div>
      ) : null}

      <div
        className={
          connection.messagingReady
            ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        }
      >
        <p>
          {connection.messagingReady
            ? "Inbox is active. New messages arrive automatically via webhooks."
            : connection.metaTokenValid
              ? "Publishing is connected. Inbox permissions can be expanded by reconnecting if you need DMs or comments."
              : "Connect Meta above to enable inbox sync."}
        </p>
        {connection.facebookCommentReplyReady ? (
          <p className="mt-2 text-xs opacity-80">
            Facebook comment replies: ready (
            <code className="rounded bg-white/60 px-1">pages_manage_engagement</code> granted).
          </p>
        ) : connection.metaConnected ? (
          <p className="mt-2 text-xs opacity-80">
            Facebook comment replies: not ready — missing{" "}
            <code className="rounded bg-white/60 px-1">pages_manage_engagement</code> on your Page
            token.
          </p>
        ) : null}
        {connection.lastSyncedAt ? (
          <p className="mt-2 text-xs opacity-80">
            Last synced {new Date(connection.lastSyncedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSyncing}
          onClick={handleSyncNow}
        >
          {isSyncing ? "Syncing…" : "Sync now"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSubscribing}
          onClick={handleSubscribeWebhooks}
        >
          {isSubscribing ? "Subscribing…" : "Refresh webhooks"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isRefreshingScopes}
          onClick={handleRefreshScopes}
        >
          {isRefreshingScopes ? "Checking…" : "Refresh scope diagnostics"}
        </Button>
        <p className="text-xs text-cos-muted">
          Manual sync is for troubleshooting. Normal use relies on webhooks and daily refresh.
        </p>
      </div>

      <details className="rounded-xl border border-cos-border bg-cos-bg/40 p-4 text-sm" open={showCommentReplyNote}>
        <summary className="cursor-pointer font-medium text-cos-text">
          Token scopes (from your Page token)
        </summary>
        <div className="mt-3 space-y-3 text-cos-muted">
          <p>
            These are the permissions Meta actually granted on your stored Page token — not what the
            Developer Dashboard lists as available. Use{" "}
            <code className="rounded bg-cos-bg px-1">Refresh scope diagnostics</code> to re-read
            from Meta&apos;s <code className="rounded bg-cos-bg px-1">debug_token</code> API.
          </p>
          <p>Inbox scopes requested on connect:</p>
          <p>
            {META_INBOX_OAUTH_SCOPE_LIST.map((scope) => (
              <ScopeBadge
                key={scope}
                scope={scope}
                granted={displayedScopes.includes(scope)}
              />
            ))}
          </p>
          {displayedScopes.length > 0 ? (
            <p>
              All granted on this token:{" "}
              {displayedScopes.map((scope) => (
                <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                  {scope}
                </code>
              ))}
            </p>
          ) : (
            <p className="text-amber-800">
              No scopes stored yet. Click Refresh scope diagnostics to read from Meta.
            </p>
          )}
          <p className="text-xs">
            Debug API:{" "}
            <code className="rounded bg-cos-bg px-1">GET /api/meta/token-scopes</code> (admin only).
          </p>
        </div>
      </details>

      <details className="rounded-xl border border-cos-border bg-cos-bg/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-cos-text">
          Meta App Review for inbox
        </summary>
        <div className="mt-3 space-y-3 text-cos-muted">
          <p>
            Inbox uses additional Meta permissions beyond publishing. In Development mode, app admins
            and testers can use inbox features without App Review. Instagram DMs only sync from
            tester/admin accounts until the app has Advanced Access for{" "}
            <code className="rounded bg-cos-bg px-1">instagram_manage_messages</code>. IG and FB
            comments sync from recent posts when{" "}
            <code className="rounded bg-cos-bg px-1">instagram_manage_comments</code>,{" "}
            <code className="rounded bg-cos-bg px-1">pages_read_user_content</code>, and{" "}
            <code className="rounded bg-cos-bg px-1">pages_manage_engagement</code> are granted.
            FB comment replies require{" "}
            <code className="rounded bg-cos-bg px-1">pages_manage_engagement</code>.
            For production, submit your app for{" "}
            <a
              href="https://developers.facebook.com/docs/app-review"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-cos-accent hover:text-cos-muted"
            >
              Meta App Review
            </a>
            .
          </p>
          <p>All OAuth scopes requested on connect:</p>
          <p>
            {META_COMBINED_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          <p>
            If you use <code className="rounded bg-cos-bg px-1">META_OAUTH_CONFIG_ID</code>, add{" "}
            <code className="rounded bg-cos-bg px-1">pages_manage_engagement</code> to that Login for
            Business configuration — the URL scope param alone is not enough.
          </p>
        </div>
      </details>

      <details className="rounded-xl border border-cos-border bg-cos-bg/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-cos-text">Diagnostics</summary>
        <div className="mt-3 space-y-2 text-cos-muted">
          <p>
            Sync enabled:{" "}
            <span className="text-cos-text">{connection.syncEnabled ? "Yes" : "No"}</span>
          </p>
          <p>
            Messaging ready:{" "}
            <span className="text-cos-text">{connection.messagingReady ? "Yes" : "No"}</span>
          </p>
          <p>
            FB comment replies ready:{" "}
            <span className="text-cos-text">
              {connection.facebookCommentReplyReady ? "Yes" : "No"}
            </span>
          </p>
          {connection.lastSyncError ? (
            <p className="text-red-600" role="alert">
              Last sync error: {connection.lastSyncError}
            </p>
          ) : (
            <p>No sync errors recorded.</p>
          )}
        </div>
      </details>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className={
            message.includes("Meta returned 0 Instagram") ||
            message.includes("Meta returned 0 Facebook") ||
            message.includes("Missing token scopes") ||
            message.includes("still missing")
              ? "text-sm text-amber-800"
              : "text-sm text-emerald-700"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
