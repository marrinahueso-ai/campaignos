"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  disconnectMondayConnectionAction,
  setMondaySyncEnabledAction,
} from "@/lib/monday/actions";

interface MondayConnectionPanelProps {
  connected: boolean;
  integrationConfigured: boolean;
  syncEnabled: boolean;
  accountSlug: string | null;
  oauthCallbackUrl?: string;
  returnTo?: string;
}

export function MondayConnectionPanel({
  connected,
  integrationConfigured,
  syncEnabled,
  accountSlug,
  oauthCallbackUrl,
  returnTo = "/settings/monday",
}: MondayConnectionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectHref = `/api/monday/oauth/start?returnTo=${encodeURIComponent(returnTo)}`;

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disconnectMondayConnectionAction();
      if (!result.success) {
        setError(result.error ?? "Could not disconnect Monday.");
        return;
      }
      setMessage("Monday disconnected.");
      router.refresh();
    });
  }

  function handleToggleSync(enabled: boolean) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setMondaySyncEnabledAction(enabled);
      if (!result.success) {
        setError(result.error ?? "Could not update sync setting.");
        return;
      }
      setMessage(enabled ? "Monday sync enabled." : "Monday sync disabled.");
      router.refresh();
    });
  }

  if (!integrationConfigured) {
    return (
      <div className="space-y-4 text-sm text-cos-muted">
        <p>
          Add your Monday.com app credentials to sync playbook tasks with a Monday board.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Create an app at{" "}
            <a
              href="https://developer.monday.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cos-text underline-offset-2 hover:underline"
            >
              developer.monday.com
            </a>
          </li>
          <li>
            Add this exact redirect URL in Developer Center → OAuth (must match character-for-character):{" "}
            <code className="break-all rounded bg-cos-bg px-1">
              {oauthCallbackUrl ?? "https://your-domain/api/monday/oauth/callback"}
            </code>
          </li>
          <li>
            Enable OAuth scopes (Developer Center → OAuth):{" "}
            <code className="rounded bg-cos-bg px-1">boards:read</code>,{" "}
            <code className="rounded bg-cos-bg px-1">boards:write</code>,{" "}
            <code className="rounded bg-cos-bg px-1">workspaces:read</code> — must
            match the authorize request exactly
          </li>
          <li>
            Set <code className="rounded bg-cos-bg px-1">MONDAY_CLIENT_ID</code> and{" "}
            <code className="rounded bg-cos-bg px-1">MONDAY_CLIENT_SECRET</code> in env
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span
            className={
              connected
                ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
                : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cos-bg text-xs font-semibold text-cos-text"
            }
            aria-hidden
          >
            {connected ? "✓" : "1"}
          </span>
          <div className="space-y-2">
            <p className="font-medium text-cos-text">Connect your Monday account</p>
            {connected ? (
              <>
                <p className="text-cos-muted">
                  {accountSlug
                    ? `Connected to ${accountSlug}.monday.com.`
                    : "Your PTO Monday account is connected."}{" "}
                  Open tasks can sync to your master board when sync is enabled.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-cos-text">
                    <input
                      type="checkbox"
                      checked={syncEnabled}
                      disabled={isPending}
                      onChange={(event) => handleToggleSync(event.target.checked)}
                      className="h-4 w-4 rounded border-cos-border"
                    />
                    Enable Monday sync
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button href={connectHref} variant="secondary" size="sm">
                    Reconnect Monday
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-cos-muted">
                  Authorize CampaignOS in Monday.com. Installing the app in Monday alone does not
                  connect your school — click the button below and approve access.
                </p>
                <Button href={connectHref}>Connect Monday</Button>
              </>
            )}
          </div>
        </li>
        <li className="flex gap-3">
          <span
            className={
              connected
                ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cos-bg text-xs font-semibold text-cos-text"
                : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-cos-border text-xs font-semibold text-cos-muted"
            }
            aria-hidden
          >
            2
          </span>
          <div>
            <p className={connected ? "font-medium text-cos-text" : "font-medium text-cos-muted"}>
              Pick a master board
            </p>
            {!connected && (
              <p className="mt-1 text-cos-muted">
                Complete step 1 first. The board picker loads automatically after you connect.
              </p>
            )}
          </div>
        </li>
      </ol>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
