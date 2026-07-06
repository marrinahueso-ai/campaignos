"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { syncInboxNowAction, subscribeInboxWebhooksAction } from "@/lib/inbox/actions";
import {
  META_COMBINED_OAUTH_SCOPE_LIST,
  META_INBOX_OAUTH_SCOPE_LIST,
} from "@/lib/meta-publishing/oauth-scopes";
import type { InboxConnectionStatus } from "@/lib/inbox/types";

interface MetaInboxSettingsPanelProps {
  connection: InboxConnectionStatus;
}

export function MetaInboxSettingsPanel({ connection }: MetaInboxSettingsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSyncing, startSyncTransition] = useTransition();
  const [isSubscribing, startSubscribeTransition] = useTransition();

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

  return (
    <div className="space-y-5">
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
            : "Publishing is connected. Reconnect with Facebook above to grant inbox permissions if DMs or comments are missing."}
        </p>
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
        <p className="text-xs text-cos-muted">
          Manual sync is for troubleshooting. Normal use relies on webhooks and daily refresh.
        </p>
      </div>

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
          <p>Inbox scopes (included in connect):</p>
          <p>
            {META_INBOX_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          <p>All OAuth scopes requested on connect:</p>
          <p>
            {META_COMBINED_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          {connection.grantedScopes.length > 0 ? (
            <p>
              Granted on this Page token:{" "}
              {connection.grantedScopes.map((scope) => (
                <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                  {scope}
                </code>
              ))}
            </p>
          ) : null}
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
            message.includes("Missing token scopes")
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
