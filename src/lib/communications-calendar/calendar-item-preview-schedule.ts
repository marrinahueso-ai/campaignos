/**
 * Calendar chip / Meta slot time wins over Approvals `schedule_at`.
 * DnD updates slots first; Approvals rows can briefly (or historically) lag.
 */
export function pickPreviewScheduleSource(input: {
  chipScheduledAt?: string | null;
  approvalScheduleAt?: string | null;
  bundleScheduledFor?: string | null;
}): string | null {
  return (
    input.chipScheduledAt ??
    input.approvalScheduleAt ??
    input.bundleScheduledFor ??
    null
  );
}
