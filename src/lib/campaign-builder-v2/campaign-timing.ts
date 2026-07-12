/**
 * Playbook convention: negative = days before event, 0 = event day, positive = after.
 */
export function playbookRelativeDay(
  eventDate: string,
  milestoneDate: string,
): number {
  const event = new Date(`${eventDate}T12:00:00`);
  const milestone = new Date(`${milestoneDate}T12:00:00`);
  return Math.round(
    (milestone.getTime() - event.getTime()) / (1000 * 60 * 60 * 24),
  );
}
