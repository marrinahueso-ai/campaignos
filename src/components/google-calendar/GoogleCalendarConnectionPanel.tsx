"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  disconnectGoogleCalendarAction,
  syncGoogleCalendarAction,
} from "@/lib/google-calendar/actions";
import { buildOAuthStartPath } from "@/lib/integrations/oauth";

interface GoogleCalendarConnectionPanelProps {
  connected: boolean;
  integrationConfigured: boolean;
  accountEmail: string | null;
  hasActiveSchoolYear: boolean;
  returnTo?: string;
  oauthError?: string | null;
  justConnected?: boolean;
}

export function GoogleCalendarConnectionPanel({
  connected,
  integrationConfigured,
  accountEmail,
  hasActiveSchoolYear,
  returnTo = "/settings/integrations/calendar",
  oauthError = null,
  justConnected = false,
}: GoogleCalendarConnectionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    justConnected ? "Google Calendar connected." : null,
  );
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  const connectHref = buildOAuthStartPath("google", { returnTo });

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disconnectGoogleCalendarAction();
      if (!result.success) {
        setError(result.error ?? "Could not disconnect.");
        return;
      }
      setMessage("Google Calendar disconnected.");
      router.refresh();
    });
  }

  function handleSync() {
    setError(null);
    setMessage(null);
    startSyncTransition(async () => {
      const result = await syncGoogleCalendarAction();
      if (!result.success) {
        setError(result.error ?? "Sync failed.");
        return;
      }
      if ((result.added ?? 0) === 0) {
        setMessage(
          result.skipped
            ? `You're up to date — ${result.skipped} event${result.skipped === 1 ? "" : "s"} already on the calendar.`
            : "You're up to date. No new events to review.",
        );
      }
      router.refresh();
    });
  }

  if (!integrationConfigured) {
    return (
      <p className="text-sm text-cos-muted">
        Google Calendar sign-in isn&apos;t set up on this server yet. You can still use a subscribe
        link or upload a file below.
      </p>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-cos-muted">
          Sign in with Google and approve calendar access. We sync events into
          review right away — confirm them and they appear on Calendar and your
          dashboard.
        </p>
        <Button href={connectHref} disabled={isPending}>
          Sign in with Google
        </Button>
        {oauthError ? (
          <p className="text-sm text-red-600" role="alert">
            {oauthErrorMessage(oauthError)}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm text-cos-text">
          <span className="font-medium">
            {accountEmail ?? "Google account"}
          </span>
          {" · Primary calendar"}
        </p>
        <p className="text-sm text-cos-muted">
          Sync pulls upcoming events into review. Confirmed dates show on
          Calendar and Today. We also refresh daily in the background.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={isSyncing || isPending || !hasActiveSchoolYear}
          onClick={handleSync}
        >
          {isSyncing ? "Syncing…" : "Sync calendar"}
        </Button>
      </div>

      {!hasActiveSchoolYear ? (
        <p className="text-sm text-amber-800">
          Set an active school year in School Setup before syncing.
        </p>
      ) : null}

      <details className="text-sm">
        <summary className="cursor-pointer text-cos-muted hover:text-cos-text">
          Manage connection
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href={connectHref} variant="secondary" size="sm" disabled={isPending}>
            Reconnect
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

function oauthErrorMessage(code: string): string {
  switch (code) {
    case "not_configured":
      return "Google Calendar isn't configured on this server yet.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    case "token_exchange_failed":
    case "save_failed":
      return "Could not finish connecting. Please try again.";
    case "invalid_state":
    case "missing_code":
      return "That sign-in link expired. Try again.";
    default:
      return "Could not connect Google Calendar. Please try again.";
  }
}

/** Small status chip used by the page header card. */
export function GoogleCalendarConnectedBadge() {
  return <Badge variant="success">Connected</Badge>;
}
