"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  disconnectMetaConnectionAction,
} from "@/lib/meta-publishing/connection-actions";
import { syncInboxNowAction } from "@/lib/inbox/actions";
import {
  META_INBOX_OAUTH_SCOPE_LIST,
  META_OAUTH_SCOPE_LIST,
} from "@/lib/meta-publishing/oauth-scopes";
import type { InboxConnectionStatus } from "@/lib/inbox/types";

interface InboxConnectionPanelProps {
  connection: InboxConnectionStatus;
  oauthError?: string | null;
  connectedJustNow?: boolean;
}

export function InboxConnectionPanel({
  connection,
  oauthError = null,
  connectedJustNow = false,
}: InboxConnectionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    connectedJustNow ? "Meta connected successfully." : null,
  );
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  const returnTo = "/inbox";
  const reconnectParams = new URLSearchParams({ returnTo, flow: "inbox" });
  if (connection.metaConnected && connection.pageName) {
    reconnectParams.set("auth_type", "rerequest");
  }
  const connectHref = `/api/meta/oauth/start?${reconnectParams.toString()}`;

  const inboxPermissionsParams = new URLSearchParams({
    returnTo,
    flow: "inbox",
    auth_type: "rerequest",
  });
  const inboxPermissionsHref = `/api/meta/oauth/start?${inboxPermissionsParams.toString()}`;

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disconnectMetaConnectionAction();
      if (!result.success) {
        setError(result.error ?? "Could not disconnect.");
        return;
      }
      setMessage("Meta disconnected.");
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
      setMessage(
        result.warning ? `${syncSummary} ${result.warning}` : syncSummary,
      );
      if (result.warning) {
        setError(null);
      }
      router.refresh();
    });
  }

  if (!connection.integrationConfigured && !connection.metaConfiguredViaEnv) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-cos-muted">
          Meta is not configured on this server yet. Ask your administrator to add Meta app
          credentials, then return here to connect your Page and Instagram account.
        </p>
        <Button href="/settings/meta" variant="secondary">
          Open Meta settings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {connection.metaConfiguredViaEnv && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Meta is connected via server environment variables for{" "}
          {connection.organizationName ?? "your organization"}.
        </p>
      )}

      {connection.metaConnected && !connection.metaConfiguredViaEnv && (
        <div
          className={
            connection.messagingReady
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          }
        >
          <p>
            Connected to <strong>{connection.pageName ?? "Facebook Page"}</strong>.
            {connection.hasInstagram
              ? " Instagram is linked."
              : " Link Instagram to your Page to enable IG channels."}
          </p>
          <p className="mt-2 opacity-90">
            {connection.messagingReady
              ? "Inbox permissions are active. Sync now or wait for webhooks to pull new messages."
              : "Publishing is ready. Grant inbox permissions below to sync DMs and comments."}
          </p>
          {connection.lastSyncedAt && (
            <p className="mt-2 text-xs opacity-80">
              Last synced {new Date(connection.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {!connection.metaConnected && !connection.metaConfiguredViaEnv && (
        <div className="space-y-3">
          <p className="text-sm text-cos-muted">
            Connect your Facebook Page and linked Instagram account. CampaignOS will request
            publish and inbox permissions in one flow.
          </p>
          <Button href={connectHref} disabled={isPending}>
            Connect with Facebook
          </Button>
        </div>
      )}

      {connection.metaConnected && !connection.metaConfiguredViaEnv && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isSyncing || isPending}
            onClick={handleSyncNow}
          >
            {isSyncing ? "Syncing…" : "Sync now"}
          </Button>
          {!connection.messagingReady && (
            <Button href={inboxPermissionsHref} variant="secondary" disabled={isPending}>
              Grant inbox permissions
            </Button>
          )}
          <Button href={connectHref} variant="secondary" disabled={isPending}>
            Reconnect with Facebook
          </Button>
          <Button href="/settings/meta" variant="ghost">
            Meta settings
          </Button>
          <Button type="button" variant="ghost" disabled={isPending} onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      )}

      {connection.metaConnected && connection.metaConfiguredViaEnv && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isSyncing} onClick={handleSyncNow}>
            {isSyncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      )}

      <details className="rounded-xl border border-cos-border bg-cos-bg/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-cos-text">
          Meta App Review for inbox
        </summary>
        <div className="mt-3 space-y-3 text-cos-muted">
          <p>
            Inbox sync uses additional Meta permissions. In Development mode, app admins and
            testers can use inbox features without App Review. For production, submit your app
            for{" "}
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
          <p>Publish scopes:</p>
          <p>
            {META_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          <p>Inbox scopes:</p>
          <p>
            {META_INBOX_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          {connection.grantedScopes.length > 0 && (
            <p>
              Granted on this Page token:{" "}
              {connection.grantedScopes.map((scope) => (
                <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                  {scope}
                </code>
              ))}
            </p>
          )}
        </div>
      </details>

      {connection.lastSyncError && (
        <p className="text-sm text-red-600" role="alert">
          Last sync error: {connection.lastSyncError}
        </p>
      )}
      {oauthError && (
        <p className="text-sm text-red-600" role="alert">
          {oauthError}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p
          className={
            message.includes("Meta returned 0 Instagram") ||
            message.includes("Missing token scopes")
              ? "text-sm text-amber-800"
              : "text-sm text-emerald-700"
          }
        >
          {message}
        </p>
      )}

      {!connection.metaConnected && (
        <p className="text-xs text-cos-muted">
          Need advanced setup?{" "}
          <Link href="/settings/meta" className="font-medium text-cos-accent hover:text-cos-muted">
            Open full Meta settings
          </Link>{" "}
          for token fallback and developer console steps.
        </p>
      )}
    </div>
  );
}
