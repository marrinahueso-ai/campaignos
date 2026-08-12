"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Soft-refresh Dashboard when the tab becomes visible again.
 * Debounce is intentionally long — layout + widgets are expensive, and
 * rapid focus switches should not remount the full RSC tree.
 */
const FOCUS_REFRESH_DEBOUNCE_MS = 30_000;

/**
 * Soft-refresh Dashboard server components when the tab becomes visible again.
 * Counts and widgets re-read Supabase; external APIs stay on background crons.
 */
export function DashboardFocusRefresh() {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    function refreshFromDb() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      if (now - lastRefreshAtRef.current < FOCUS_REFRESH_DEBOUNCE_MS) {
        return;
      }

      lastRefreshAtRef.current = now;
      router.refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshFromDb();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
