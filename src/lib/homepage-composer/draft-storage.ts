import { createComposerDraftStore } from "@/lib/composer-draft-storage";
import {
  mergeMonthMapArtwork,
  slimMonthCards,
  slimMonthMap,
  stashWorkingMonth,
} from "@/lib/homepage-composer/month-drafts";
import type { HomepageComposerState } from "@/lib/homepage-composer/types";

export type { DraftSaveStatus } from "@/lib/composer-draft-storage";

function isLegacyHomepageState(
  parsed: unknown,
): parsed is HomepageComposerState {
  return (
    parsed !== null &&
    typeof parsed === "object" &&
    "header" in parsed &&
    "footer" in parsed &&
    "cards" in parsed
  );
}

function slimForQuota(state: HomepageComposerState): HomepageComposerState {
  return {
    ...state,
    cards: slimMonthCards(state.cards),
    monthDrafts: slimMonthMap(state.monthDrafts ?? {}),
    monthSaved: slimMonthMap(state.monthSaved ?? {}),
  };
}

function mergeFromOlder(
  newer: HomepageComposerState,
  older: HomepageComposerState,
): HomepageComposerState {
  const artById = new Map(
    older.cards
      .filter((c) => c.imageUrl)
      .map((c) => [c.id, c.imageUrl] as const),
  );

  let cards = newer.cards;
  if (artById.size > 0) {
    let changed = false;
    cards = newer.cards.map((card) => {
      if (card.imageUrl) return card;
      const fromIdb = artById.get(card.id);
      if (!fromIdb) return card;
      changed = true;
      return { ...card, imageUrl: fromIdb };
    });
    if (!changed) cards = newer.cards;
  }

  const monthDrafts = mergeMonthMapArtwork(
    newer.monthDrafts ?? {},
    older.monthDrafts ?? {},
  );
  const monthSaved = mergeMonthMapArtwork(
    newer.monthSaved ?? {},
    older.monthSaved ?? {},
  );

  if (
    cards === newer.cards &&
    monthDrafts === (newer.monthDrafts ?? {}) &&
    monthSaved === (newer.monthSaved ?? {})
  ) {
    return newer;
  }

  return { ...newer, cards, monthDrafts, monthSaved };
}

const store = createComposerDraftStore<HomepageComposerState>({
  dbName: "heyralli-homepage-composer",
  envelopeVersion: 4,
  localStorageKey: (organizationId) =>
    `homepage-composer:v4:${organizationId ?? "local"}`,
  legacyLocalStorageKeys: (organizationId) => {
    const org = organizationId ?? "local";
    return [
      `homepage-composer:v3:${org}`,
      `homepage-composer:v2:${org}`,
      `homepage-composer:v1:${org}`,
    ];
  },
  isLegacyState: isLegacyHomepageState,
  slimForQuota,
  mergeFromOlder,
});

/** Load newest draft JSON string (compares IndexedDB vs localStorage by `at`). */
export async function loadComposerDraftRaw(
  organizationId: string | null,
): Promise<string | null> {
  return store.loadRaw(organizationId);
}

/**
 * Persist full draft (including uploaded artwork URLs / data URLs).
 * Writes localStorage synchronously first so a mid-navigation unmount cannot
 * cancel the only copy, then mirrors to IndexedDB for large payloads.
 * Stashes the active working month into monthDrafts before write.
 */
export async function saveComposerDraft(
  organizationId: string | null,
  state: HomepageComposerState,
  savedAt: number = Date.now(),
): Promise<void> {
  const withStash =
    state.workingMonth && state.monthDrafts
      ? stashWorkingMonth(state)
      : state;
  return store.save(organizationId, withStash, savedAt);
}

/** Parse storage payload to composer state (v4 envelope or legacy raw). */
export function parseComposerDraftRaw(
  raw: string,
): HomepageComposerState | null {
  return store.parseRaw(raw);
}
