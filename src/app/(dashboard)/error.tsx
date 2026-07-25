"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

function isStaleChunkError(error: Error): boolean {
  const message = `${error.name} ${error.message}`;
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /undefined is not an object \(evaluating ['"]e\[r\]\.call['"]\)/i.test(
      message,
    )
  );
}

/**
 * After a production deploy, Safari/Chrome can keep old webpack chunks in
 * memory. Navigating then throws `e[r].call` / ChunkLoadError. Reload once
 * to pick up the new build.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isStaleChunkError(error)) return;
    const key = "heyralli-chunk-reload";
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, [error]);

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
