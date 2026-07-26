/**
 * Clears locally-cached Campaign Builder drafts + artwork backups from
 * this browser. Call this ONLY on an explicit, user-initiated sign-out —
 * never on a session-expiry redirect or middleware bounce — so a
 * shared/kiosk computer (e.g. a front-office machine two board members
 * both use) doesn't leave one member's unsaved draft artwork/captions
 * readable by the next person who signs in on the same device.
 *
 * Deliberately narrow in scope: `campaign_builder_sessions` local
 * storage is a durable, event-scoped backup (see artwork-backup.ts) that
 * has previously been broken by overly-aggressive clearing, so this only
 * removes entries matching the two known prefixes rather than wiping
 * localStorage wholesale. UI-preference keys (sidebar collapsed state,
 * last-viewed-event pointer) and sessionStorage (already cleared when
 * the tab/browser closes) are intentionally left alone.
 */

import { LOCAL_SESSION_KEY_PREFIX } from "./seed-data.ts";
import { ARTWORK_BACKUP_KEY_PREFIX } from "./artwork-backup.ts";

const CLEARED_KEY_PREFIXES = [LOCAL_SESSION_KEY_PREFIX, ARTWORK_BACKUP_KEY_PREFIX];

export function clearLocalCampaignBuilderStorageOnSignOut(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const { localStorage } = window;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && CLEARED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Private-mode / quota errors leave nothing to clear — sign-out itself
    // must never fail because of this.
  }
}
