/**
 * Detect client/server skew after a production deploy (old tab + new build).
 * Used by the dashboard error boundary and window-level recovery so users get
 * an automatic one-shot reload instead of a dead-end error screen.
 */

export const DEPLOY_SKEW_RELOAD_KEY = "heyralli-chunk-reload";

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

/** True when the failure is almost certainly stale client assets / action IDs. */
export function isDeploySkewError(error: unknown): boolean {
  const message = errorText(error);
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /undefined is not an object \(evaluating ['"]e\[r\]\.call['"]\)/i.test(
      message,
    ) ||
    /Failed to find Server Action/i.test(message) ||
    /older or newer deployment/i.test(message) ||
    /server action.*not found/i.test(message) ||
    /Failed to fetch RSC payload/i.test(message)
  );
}

/**
 * Reload once per tab session when deploy skew is detected.
 * Returns true when a reload was triggered (or attempted).
 */
export function reloadOnceForDeploySkew(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(DEPLOY_SKEW_RELOAD_KEY) === "1") {
      return false;
    }
    sessionStorage.setItem(DEPLOY_SKEW_RELOAD_KEY, "1");
  } catch {
    // sessionStorage may be blocked — still reload.
  }
  window.location.reload();
  return true;
}

/** Clear the one-shot guard after a successful paint of the new build. */
export function clearDeploySkewReloadGuard(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DEPLOY_SKEW_RELOAD_KEY);
  } catch {
    // ignore
  }
}
