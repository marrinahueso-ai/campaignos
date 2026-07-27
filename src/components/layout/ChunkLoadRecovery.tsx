"use client";

import { useEffect } from "react";
import {
  clearDeploySkewReloadGuard,
  isDeploySkewError,
  reloadOnceForDeploySkew,
} from "@/lib/next/deploy-skew";

/**
 * Catches deploy-skew webpack chunk / Server Action failures outside React
 * error boundaries (e.g. org switcher POST → redirect while an old tab is open).
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    // Successful paint after a deploy → allow a future one-shot reload.
    clearDeploySkewReloadGuard();

    const onError = (event: ErrorEvent) => {
      if (isDeploySkewError(event.error) || isDeploySkewError(event.message)) {
        event.preventDefault();
        reloadOnceForDeploySkew();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isDeploySkewError(event.reason)) {
        event.preventDefault();
        reloadOnceForDeploySkew();
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
