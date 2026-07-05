"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { disconnectMondayConnectionAction } from "@/lib/monday/actions";

export default function MondaySettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Monday settings route error:", error);
  }, [error]);

  function handleDisconnect() {
    void disconnectMondayConnectionAction().finally(() => {
      reset();
    });
  }

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-6 pb-12 pt-6">
      <h1 className="text-xl font-semibold text-cos-text">Monday settings unavailable</h1>
      <p className="text-sm text-cos-muted">
        Something went wrong while loading Monday integration settings. You can try again or
        disconnect Monday to start fresh.
      </p>
      {error.digest && (
        <p className="text-xs text-cos-muted">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" size="sm" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleDisconnect}>
          Disconnect Monday
        </Button>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-cos-text underline-offset-2 hover:underline"
        >
          Back to settings
        </Link>
      </div>
    </div>
  );
}
