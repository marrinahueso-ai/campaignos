"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  disconnectMetaConnectionAction,
} from "@/lib/meta-publishing/connection-actions";
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

  const returnTo = "/inbox";
  const reconnectParams = new URLSearchParams({ returnTo });
  if (connection.metaConnected && connection.pageName) {
    reconnectParams.set("auth_type", "rerequest");
  }
  const connectHref = `/api/meta/oauth/start?${reconnectParams.toString()}`;

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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>
            Connected to <strong>{connection.pageName ?? "Facebook Page"}</strong>.
            {connection.hasInstagram
              ? " Instagram is linked for publishing."
              : " Link Instagram to your Page to enable IG channels."}
          </p>
          <p className="mt-2 text-emerald-900/80">
            Publishing is ready. Message and comment sync will activate in Phase 2 after Meta App
            Review for inbox permissions.
          </p>
        </div>
      )}

      {!connection.metaConnected && !connection.metaConfiguredViaEnv && (
        <div className="space-y-3">
          <p className="text-sm text-cos-muted">
            Connect your Facebook Page and linked Instagram account once. CampaignOS reuses this
            connection for publishing today and will sync DMs and comments here in Phase 2.
          </p>
          <Button href={connectHref} disabled={isPending}>
            Connect with Facebook
          </Button>
        </div>
      )}

      {connection.metaConnected && !connection.metaConfiguredViaEnv && (
        <div className="flex flex-wrap gap-2">
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

      <details className="rounded-xl border border-cos-border bg-cos-bg/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-cos-text">
          Meta App Review for inbox (Phase 2+)
        </summary>
        <div className="mt-3 space-y-3 text-cos-muted">
          <p>
            Publishing uses scopes already enabled on your Meta app. To pull DMs and comments into
            this inbox and send replies, CampaignOS will request additional permissions and submit
            your app for{" "}
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
          <p>Current publish scopes:</p>
          <p>
            {META_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          <p>Future inbox scopes (Phase 2 sync + Phase 4 send):</p>
          <p>
            {META_INBOX_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          <p>
            Until App Review is approved, you can connect your Page here for publishing. Inbox sync
            stays empty until Phase 2 is enabled on your deployment.
          </p>
        </div>
      </details>

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
