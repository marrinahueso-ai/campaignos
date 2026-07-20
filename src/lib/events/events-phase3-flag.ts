/**
 * Phase 3 Events Home + Event Detail UI.
 * Default ON. Set NEXT_PUBLIC_EVENTS_PHASE3_UI=false to use legacy Campaigns /
 * Planning Hub composition (kept as fallback).
 */
export function isEventsPhase3UiEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_EVENTS_PHASE3_UI?.trim().toLowerCase();
  if (value === "false" || value === "0" || value === "no") {
    return false;
  }
  return true;
}
