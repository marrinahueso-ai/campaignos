export function shouldShowEventDetailsChangedNotice(
  eventUpdatedAt: string | null | undefined,
  drafts: Array<{ lastUpdated: string }>,
): boolean {
  if (!eventUpdatedAt || drafts.length === 0) return false;

  const updatedAtMs = new Date(eventUpdatedAt).getTime();
  if (Number.isNaN(updatedAtMs)) return false;

  return drafts.some((draft) => {
    const draftUpdatedMs = new Date(draft.lastUpdated).getTime();
    return !Number.isNaN(draftUpdatedMs) && draftUpdatedMs < updatedAtMs;
  });
}

export function shouldShowHubEventDetailsChangedNotice(
  eventUpdatedAt: string | null | undefined,
  communications: Array<{ lastUpdated: string; latestContent: string | null }>,
): boolean {
  if (!eventUpdatedAt) return false;

  const drafts = communications.filter((item) => item.latestContent?.trim());
  return shouldShowEventDetailsChangedNotice(eventUpdatedAt, drafts);
}
