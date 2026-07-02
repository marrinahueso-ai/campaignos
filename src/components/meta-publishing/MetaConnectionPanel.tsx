"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  connectMetaWithUserTokenAction,
  disconnectMetaConnectionAction,
  saveMetaConnectionAction,
} from "@/lib/meta-publishing/connection-actions";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";
import type { MetaConnection } from "@/lib/meta-publishing/types";

interface MetaConnectionPanelProps {
  connection: MetaConnection | null;
  configuredViaEnv: boolean;
}

export function MetaConnectionPanel({
  connection,
  configuredViaEnv,
}: MetaConnectionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPending, startTransition] = useTransition();

  const connected = isMetaConnectionConfigured(connection);
  const hasInstagram = isInstagramPublishingConfigured(connection);

  function handleQuickConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await connectMetaWithUserTokenAction({
        userAccessToken: String(form.get("userAccessToken") ?? ""),
      });

      if (!result.success) {
        setError(result.error ?? "Could not connect Meta.");
        return;
      }

      setMessage(
        result.pageName
          ? `Connected to ${result.pageName}${result.hasInstagram ? "" : " (Facebook only — Instagram not linked yet)"}.`
          : "Meta connection saved.",
      );
      router.refresh();
    });
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveMetaConnectionAction({
        facebookPageId: String(form.get("facebookPageId") ?? ""),
        instagramAccountId: String(form.get("instagramAccountId") ?? ""),
        pageAccessToken: String(form.get("pageAccessToken") ?? ""),
      });

      if (!result.success) {
        setError(result.error ?? "Could not save Meta connection.");
        return;
      }

      setMessage(
        result.pageName
          ? `Connected to ${result.pageName}. Auto-publish is ready.`
          : "Meta connection saved.",
      );
      router.refresh();
    });
  }

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

  return (
    <div className="space-y-6">
      {configuredViaEnv && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Meta is connected via server environment variables. Auto-publish is active.
        </p>
      )}

      {connection && !configuredViaEnv && connected && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Connected to {connection.pageName ?? "Facebook Page"}.
          {hasInstagram
            ? " Facebook and Instagram auto-posting is ready."
            : " Facebook auto-posting is ready. Link Instagram to your Page to enable IG posts."}
        </p>
      )}

      {!configuredViaEnv && (
        <div className="space-y-4 rounded-xl border border-cos-border bg-cos-bg/40 p-4">
          <div>
            <h3 className="text-sm font-semibold text-cos-text">Quick connect</h3>
            <p className="mt-1 text-sm text-cos-muted">
              Paste the token from Graph API Explorer. CampaignOS finds your Page, swaps in the
              correct Page token, and saves everything for you.
            </p>
          </div>

          <ol className="list-decimal space-y-1 pl-5 text-sm text-cos-muted">
            <li>
              Open{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-cos-accent hover:text-cos-muted"
              >
                Graph API Explorer
              </a>{" "}
              → select your <strong>PTO Test Page</strong> app
            </li>
            <li>
              Add permissions: <code className="rounded bg-white px-1">pages_show_list</code>,{" "}
              <code className="rounded bg-white px-1">pages_read_engagement</code>,{" "}
              <code className="rounded bg-white px-1">pages_manage_posts</code>
            </li>
            <li>Click Generate Access Token → approve → select Pto test page</li>
            <li>Copy the token and paste it below</li>
          </ol>

          <form onSubmit={handleQuickConnect} className="space-y-3">
            <Input
              name="userAccessToken"
              label="Graph API access token"
              type="password"
              placeholder="EAAM..."
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Connecting…" : connected ? "Reconnect Meta" : "Connect Meta"}
            </Button>
          </form>
        </div>
      )}

      {!configuredViaEnv && (
        <div>
          <button
            type="button"
            className="text-sm font-medium text-cos-accent hover:text-cos-muted"
            onClick={() => setShowAdvanced((value) => !value)}
          >
            {showAdvanced ? "Hide advanced manual setup" : "Advanced manual setup"}
          </button>

          {showAdvanced && (
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <Input
                name="facebookPageId"
                label="Facebook Page ID"
                placeholder="123456789012345"
                defaultValue={connection?.id === "env" ? "" : (connection?.facebookPageId ?? "")}
                disabled={isPending}
              />
              <Input
                name="instagramAccountId"
                label="Instagram Business Account ID (optional)"
                placeholder="17841400000000000"
                defaultValue={
                  connection?.id === "env" ? "" : (connection?.instagramAccountId ?? "")
                }
                disabled={isPending}
              />
              <Input
                name="pageAccessToken"
                label="Page Access Token"
                type="password"
                placeholder="EAAG..."
                disabled={isPending}
              />

              <Button type="submit" variant="secondary" disabled={isPending}>
                {isPending ? "Saving…" : "Save manual connection"}
              </Button>
            </form>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      {connection && !configuredViaEnv && (
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleDisconnect}>
          Disconnect
        </Button>
      )}
    </div>
  );
}
