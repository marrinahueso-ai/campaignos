import type { MetaPublicationSlotStatus } from "@/lib/meta-publishing/types";

/** Slots that must survive playbook sync and appear on Calendar / Meta planner. */
export const COMMITTED_META_SLOT_STATUSES: readonly MetaPublicationSlotStatus[] = [
  "scheduled",
  "approved",
  "posting",
  "published",
  "failed",
] as const;

const COMMITTED_META_SLOT_STATUS_SET = new Set<string>(COMMITTED_META_SLOT_STATUSES);

export function isCommittedMetaSlotStatus(
  status: string | null | undefined,
): boolean {
  return Boolean(status && COMMITTED_META_SLOT_STATUS_SET.has(status));
}
