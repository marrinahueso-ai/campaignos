/**
 * Development-only Event Detail tab load timing.
 * Never enables itself in production builds.
 */
export type TabTimingMarks = {
  totalMs?: number;
  authContextMs?: number;
  primaryQueryMs?: number;
  assigneeEnrichmentMs?: number;
  previewEnrichmentMs?: number;
  dtoMappingMs?: number;
};

const ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.EVENT_TAB_TIMING !== "0";

export function tabTimingEnabled(): boolean {
  return ENABLED;
}

export function startTabTimer(): number {
  return performance.now();
}

export function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

export function logTabTiming(
  tab: string,
  eventId: string,
  marks: TabTimingMarks,
): void {
  if (!ENABLED) {
    return;
  }
  console.info("[event-tab-timing]", {
    tab,
    eventId,
    ...marks,
  });
}
