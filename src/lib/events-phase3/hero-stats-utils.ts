/**
 * Pure helpers for event detail hero stat source selection.
 * Kept free of server-only so unit tests can import them directly.
 */

/** Count milestones from campaign_builder_sessions.session_data when present. */
export function countMilestonesFromSessionData(
  sessionData: unknown,
): number | null {
  if (!sessionData || typeof sessionData !== "object") {
    return null;
  }
  const milestones = (sessionData as { milestones?: unknown }).milestones;
  if (!Array.isArray(milestones)) {
    return null;
  }
  return milestones.length;
}

/**
 * Prefer Create with AI session milestones when present; otherwise classic
 * event_communication_steps count.
 */
export function resolveHeroMilestoneCount(
  sessionMilestoneCount: number | null,
  communicationStepsCount: number,
): number {
  if (sessionMilestoneCount != null) {
    return sessionMilestoneCount;
  }
  return communicationStepsCount;
}
