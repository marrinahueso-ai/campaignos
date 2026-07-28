import { createComposerDraftStore } from "@/lib/composer-draft-storage";
import type { VolunteerComposerState } from "@/lib/volunteer-composer/types";

export type { DraftSaveStatus } from "@/lib/composer-draft-storage";

function isLegacyVolunteerState(
  parsed: unknown,
): parsed is VolunteerComposerState {
  return (
    parsed !== null &&
    typeof parsed === "object" &&
    "header" in parsed &&
    "footer" in parsed &&
    "opportunities" in parsed
  );
}

const store = createComposerDraftStore<VolunteerComposerState>({
  dbName: "heyralli-volunteer-composer",
  envelopeVersion: 1,
  localStorageKey: (organizationId) =>
    `volunteer-composer:v1:${organizationId ?? "local"}`,
  isLegacyState: isLegacyVolunteerState,
});

export async function loadComposerDraftRaw(
  organizationId: string | null,
): Promise<string | null> {
  return store.loadRaw(organizationId);
}

export async function saveComposerDraft(
  organizationId: string | null,
  state: VolunteerComposerState,
  savedAt: number = Date.now(),
): Promise<void> {
  return store.save(organizationId, state, savedAt);
}

export function parseComposerDraftRaw(
  raw: string,
): VolunteerComposerState | null {
  return store.parseRaw(raw);
}
