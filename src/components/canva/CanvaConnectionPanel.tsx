"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { disconnectCanvaConnectionAction } from "@/lib/canva/actions";
import { buildOAuthStartPath } from "@/lib/integrations/oauth";

interface CanvaConnectionPanelProps {
  connected: boolean;
  integrationConfigured: boolean;
  returnTo?: string;
}

export function CanvaConnectionPanel({
  connected,
  integrationConfigured,
  returnTo = "/settings/canva",
}: CanvaConnectionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectHref = buildOAuthStartPath("canva", { returnTo });

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disconnectCanvaConnectionAction();
      if (!result.success) {
        setError(result.error ?? "Could not disconnect Canva.");
        return;
      }
      setMessage("Canva disconnected.");
      router.refresh();
    });
  }

  if (!integrationConfigured) {
    return (
      <div className="space-y-4 text-sm text-cos-muted">
        <p>
          Add your Canva Connect app credentials to enable direct import from Canva into
          artwork milestones.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Create an integration at{" "}
            <a
              href="https://www.canva.com/developers/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cos-text underline-offset-2 hover:underline"
            >
              canva.com/developers
            </a>
          </li>
          <li>Set redirect URL to{" "}
            <code className="rounded bg-cos-bg px-1">/api/canva/oauth/callback</code>
          </li>
          <li>Add scopes: <code className="rounded bg-cos-bg px-1">design:meta:read</code>,{" "}
            <code className="rounded bg-cos-bg px-1">design:content:read</code>
          </li>
          <li>Set <code className="rounded bg-cos-bg px-1">CANVA_CLIENT_ID</code> and{" "}
            <code className="rounded bg-cos-bg px-1">CANVA_CLIENT_SECRET</code> in env
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connected ? (
        <>
          <p className="text-sm text-cos-muted">
            Your PTO Canva account is connected. Volunteers can import designs directly into
            campaign artwork — no manual download step.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button href={connectHref} variant="secondary" size="sm">
              Reconnect Canva
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
          <p className="text-sm text-cos-muted">
            Connect once for your school. Then import Canva designs straight into artwork
            milestones from the Artwork tab.
          </p>
          <Button href={connectHref}>Connect Canva</Button>
        </>
      )}

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
