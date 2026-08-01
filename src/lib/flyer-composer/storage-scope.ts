/**
 * Per-org (+ event) scope for Flyer composer localStorage drafts.
 * Prevents School B preview/draft state from restoring under School A
 * (or a shared unscoped key), and makes sign-out cleanup straightforward.
 *
 * Keep key shape in sync with public/create-with-ai-flyer.html
 * (`draftStorageKey` / STORAGE_KEY_BASE).
 */

export const FLYER_COMPOSER_DRAFT_STORAGE_PREFIX = "hr-flyer-composer-draft";

/** Sentinel event segment when the flyer is not linked to a campaign. */
export const FLYER_COMPOSER_NO_EVENT_SEGMENT = "no-event";

export type FlyerComposerDraftContext = {
  organizationId: string;
  eventId: string | null;
};

/** Build org+event scoped key; returns null when organizationId is missing. */
export function flyerComposerDraftStorageKey(input: {
  organizationId: string | null | undefined;
  eventId?: string | null | undefined;
}): string | null {
  const orgId = input.organizationId?.trim() || "";
  if (!orgId) return null;
  const eventId = input.eventId?.trim() || "";
  const eventPart = eventId || FLYER_COMPOSER_NO_EVENT_SEGMENT;
  return `${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:${orgId}:${eventPart}`;
}

/** Legacy keys used before org scoping (event-only or global). */
export function flyerComposerLegacyDraftStorageKeys(eventId?: string | null): string[] {
  const keys = [FLYER_COMPOSER_DRAFT_STORAGE_PREFIX];
  const id = eventId?.trim() || "";
  if (id) keys.unshift(`${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:${id}`);
  return keys;
}

/**
 * Restore only when stored org (+ event) match the active composer context.
 * Empty draft event is allowed only when the current context also has no event.
 */
export function flyerComposerDraftMatchesContext(
  draft: { organizationId?: unknown; approvalEventId?: unknown },
  context: FlyerComposerDraftContext,
): boolean {
  const draftOrg =
    typeof draft.organizationId === "string" ? draft.organizationId.trim() : "";
  const ctxOrg = context.organizationId.trim();
  if (!draftOrg || !ctxOrg || draftOrg !== ctxOrg) return false;

  const draftEvent =
    typeof draft.approvalEventId === "string" ? draft.approvalEventId.trim() : "";
  const ctxEvent = context.eventId?.trim() || "";
  return draftEvent === ctxEvent;
}

/** Clears every Flyer composer draft key from this browser (sign-out). */
export function clearFlyerComposerLocalStorageOnSignOut(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const { localStorage } = window;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key === FLYER_COMPOSER_DRAFT_STORAGE_PREFIX ||
          key.startsWith(`${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:`))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Sign-out must never fail because of localStorage.
  }
}
