"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  isDeploySkewError,
  reloadOnceForDeploySkew,
} from "@/lib/next/deploy-skew";

/**
 * After a production deploy, Safari/Chrome can keep old webpack chunks or
 * Server Action IDs in memory. Navigating / clicking then throws. Reload once
 * to pick up the new build.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const deploySkew = isDeploySkewError(error);

  useEffect(() => {
    if (!deploySkew) return;
    reloadOnceForDeploySkew();
  }, [deploySkew]);

  if (deploySkew) {
    return (
      <div className="studio-page flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-2xl text-cos-text">Updating…</h1>
        <p className="max-w-md text-sm text-cos-muted">
          A newer version of the app is available. Refreshing this page to load
          it.
        </p>
        <Button type="button" onClick={() => window.location.reload()}>
          Refresh now
        </Button>
      </div>
    );
  }

  return (
    <div className="studio-page flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-2xl text-cos-text">Something went wrong</h1>
      <p className="max-w-md text-sm text-cos-muted">
        A page update may have interrupted this screen. Refresh to load the
        latest version, or try again.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => window.location.reload()}>
          Refresh page
        </Button>
        <Button type="button" variant="secondary" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
