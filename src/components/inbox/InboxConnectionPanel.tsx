"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
} from "@/lib/integrations/oauth";
import {
  disconnectMetaConnectionAction,
} from "@/lib/meta-publishing/connection-actions";
import { syncInboxNowAction } from "@/lib/inbox/actions";
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
  const metaSettingsHref = buildIntegrationSettingsPath("meta", returnTo);
  const connectHref = buildMetaOAuthStartPath({ returnTo });
  const reconnectHref = buildMetaOAuthStartPath({
    returnTo,
    pageId: connection.facebookPageId,
    authType: "rerequest",
  });

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
      setMessage(
        `Sync complete — ${threadCount} thread${threadCount === 1 ? "" : "s"}, ${messageCount} message${messageCount === 1 ? "" : "s"}.`,
      );
      router.refresh();
    });
  }

  if (!connection.integrationConfigured && !connection.metaConfiguredViaEnv) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-cos-muted">
          Meta is not configured on this server yet. Ask your administrator to add Meta app
          credentials, then return here to connect.
        </p>
        <Button href={metaSettingsHref} variant="secondary">
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
              ? "Inbox is ready. Sync now or wait for new messages."
              : "Publishing is ready. Reconnect once to approve inbox permissions."}
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
            Connect once with Facebook. Approve the use cases — publishing, inbox, and Insights
            share the same connection.
          </p>
          <Button href={connectHref} disabled={isPending}>
            Connect with Facebook
          </Button>
          <p className="text-xs text-cos-muted">
            Or manage the connection in{" "}
            <Link href={metaSettingsHref} className="font-medium text-cos-accent hover:text-cos-muted">
              Meta settings
            </Link>
            .
          </p>
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
            <Button href={reconnectHref} variant="secondary" disabled={isPending}>
              Approve inbox permissions
            </Button>
          )}
          <Button href={reconnectHref} variant="secondary" disabled={isPending}>
            Reconnect
          </Button>
          <Button href={metaSettingsHref} variant="ghost">
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
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
