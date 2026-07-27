import { createComposerDraftStore } from "@/lib/composer-draft-storage";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";

export type { DraftSaveStatus } from "@/lib/composer-draft-storage";

function isLegacyNewsletterState(
  parsed: unknown,
): parsed is NewsletterComposerState {
  return (
    parsed !== null &&
    typeof parsed === "object" &&
    "subject" in parsed &&
    "stories" in parsed &&
    "layoutBlocks" in parsed
  );
}

function clearDataUrl(url: string | null): string | null {
  return url?.startsWith("data:") ? null : url;
}

function slimForQuota(state: NewsletterComposerState): NewsletterComposerState {
  return {
    ...state,
    headerImageUrl: clearDataUrl(state.headerImageUrl),
    stories: state.stories.map((s) => ({
      ...s,
      imageUrl: clearDataUrl(s.imageUrl),
    })),
    volunteerAsks: state.volunteerAsks.map((v) => ({
      ...v,
      imageUrl: clearDataUrl(v.imageUrl),
    })),
    sponsors: state.sponsors.map((s) => ({
      ...s,
      imageUrl: clearDataUrl(s.imageUrl),
    })),
  };
}

function mergeFromOlder(
  newer: NewsletterComposerState,
  older: NewsletterComposerState,
): NewsletterComposerState {
  const storyArt = new Map(
    older.stories
      .filter((s) => s.imageUrl)
      .map((s) => [s.id, s.imageUrl] as const),
  );
  const volArt = new Map(
    older.volunteerAsks
      .filter((v) => v.imageUrl)
      .map((v) => [v.id, v.imageUrl] as const),
  );
  const sponsorArt = new Map(
    older.sponsors
      .filter((s) => s.imageUrl)
      .map((s) => [s.id, s.imageUrl] as const),
  );

  let changed = false;
  const headerImageUrl =
    newer.headerImageUrl ?? older.headerImageUrl ?? null;
  if (headerImageUrl !== newer.headerImageUrl) changed = true;

  const stories = newer.stories.map((story) => {
    if (story.imageUrl) return story;
    const fromIdb = storyArt.get(story.id);
    if (!fromIdb) return story;
    changed = true;
    return { ...story, imageUrl: fromIdb };
  });
  const volunteerAsks = newer.volunteerAsks.map((ask) => {
    if (ask.imageUrl) return ask;
    const fromIdb = volArt.get(ask.id);
    if (!fromIdb) return ask;
    changed = true;
    return { ...ask, imageUrl: fromIdb };
  });
  const sponsors = newer.sponsors.map((sponsor) => {
    if (sponsor.imageUrl) return sponsor;
    const fromIdb = sponsorArt.get(sponsor.id);
    if (!fromIdb) return sponsor;
    changed = true;
    return { ...sponsor, imageUrl: fromIdb };
  });

  return changed
    ? { ...newer, headerImageUrl, stories, volunteerAsks, sponsors }
    : newer;
}

const store = createComposerDraftStore<NewsletterComposerState>({
  dbName: "heyralli-newsletter-composer",
  /** v2 envelope with `at` — migrates legacy raw v1 JSON on read. */
  envelopeVersion: 2,
  localStorageKey: (organizationId) =>
    `newsletter-composer:v2:${organizationId ?? "local"}`,
  legacyLocalStorageKeys: (organizationId) => [
    `newsletter-composer:v1:${organizationId ?? "local"}`,
  ],
  isLegacyState: isLegacyNewsletterState,
  slimForQuota,
  mergeFromOlder,
});

/** Load newest draft (IndexedDB vs localStorage by `at`; newest wins). */
export async function loadComposerDraftRaw(
  organizationId: string | null,
): Promise<string | null> {
  return store.loadRaw(organizationId);
}

/**
 * Persist draft: sync localStorage first, then IndexedDB.
 * Skips stale IDB writes when a newer save already landed.
 */
export async function saveComposerDraft(
  organizationId: string | null,
  state: NewsletterComposerState,
  savedAt: number = Date.now(),
): Promise<void> {
  return store.save(organizationId, state, savedAt);
}

/** Parse v2 envelope or legacy raw NewsletterComposerState. */
export function parseComposerDraftRaw(
  raw: string,
): NewsletterComposerState | null {
  return store.parseRaw(raw);
}
