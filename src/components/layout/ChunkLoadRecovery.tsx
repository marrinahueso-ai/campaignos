"use client";

import { useEffect } from "react";

function isStaleAssetError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
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

function reloadOnce(): void {
  try {
    const key = "heyralli-chunk-reload";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage may be blocked — still reload.
  }
  window.location.reload();
}

/**
 * Catches deploy-skew webpack chunk failures outside React error boundaries
 * (e.g. org switcher POST → redirect while an old tab is open).
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    // Successful paint after a deploy → allow a future one-shot reload.
    try {
      sessionStorage.removeItem("heyralli-chunk-reload");
    } catch {
      // ignore
    }

    const onError = (event: ErrorEvent) => {
      if (isStaleAssetError(event.error) || isStaleAssetError(event.message)) {
        event.preventDefault();
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleAssetError(event.reason)) {
        event.preventDefault();
        reloadOnce();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
