import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  FLYER_COMPOSER_DRAFT_STORAGE_PREFIX,
  FLYER_COMPOSER_NO_EVENT_SEGMENT,
  clearFlyerComposerLocalStorageOnSignOut,
  flyerComposerDraftMatchesContext,
  flyerComposerDraftStorageKey,
  flyerComposerLegacyDraftStorageKeys,
} from "../storage-scope.ts";

function withMockLocalStorage(
  initial: Record<string, string>,
  run: (store: Map<string, string>) => void,
): void {
  const store = new Map(Object.entries(initial));
  const previousWindow = (globalThis as { window?: unknown }).window;

  (globalThis as { window: unknown }).window = {
    localStorage: {
      get length() {
        return store.size;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
    },
  };

  try {
    run(store);
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window: unknown }).window = previousWindow;
    }
  }
}

describe("flyerComposerDraftStorageKey", () => {
  it("scopes by organizationId + eventId", () => {
    assert.equal(
      flyerComposerDraftStorageKey({
        organizationId: "org-a",
        eventId: "evt-1",
      }),
      `${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:org-a:evt-1`,
    );
  });

  it("uses no-event sentinel when event is missing", () => {
    assert.equal(
      flyerComposerDraftStorageKey({ organizationId: "org-a" }),
      `${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:org-a:${FLYER_COMPOSER_NO_EVENT_SEGMENT}`,
    );
  });

  it("returns null without organizationId (fail closed)", () => {
    assert.equal(flyerComposerDraftStorageKey({ organizationId: "" }), null);
    assert.equal(
      flyerComposerDraftStorageKey({ organizationId: null, eventId: "evt" }),
      null,
    );
  });
});

describe("flyerComposerDraftMatchesContext", () => {
  it("requires matching organizationId and eventId", () => {
    assert.equal(
      flyerComposerDraftMatchesContext(
        { organizationId: "org-a", approvalEventId: "evt-1" },
        { organizationId: "org-a", eventId: "evt-1" },
      ),
      true,
    );
    assert.equal(
      flyerComposerDraftMatchesContext(
        { organizationId: "org-b", approvalEventId: "evt-1" },
        { organizationId: "org-a", eventId: "evt-1" },
      ),
      false,
    );
    assert.equal(
      flyerComposerDraftMatchesContext(
        { organizationId: "org-a", approvalEventId: "evt-b" },
        { organizationId: "org-a", eventId: "evt-a" },
      ),
      false,
    );
  });

  it("rejects drafts missing organizationId", () => {
    assert.equal(
      flyerComposerDraftMatchesContext(
        { approvalEventId: "evt-1" },
        { organizationId: "org-a", eventId: "evt-1" },
      ),
      false,
    );
  });

  it("only restores no-event drafts in no-event context", () => {
    assert.equal(
      flyerComposerDraftMatchesContext(
        { organizationId: "org-a" },
        { organizationId: "org-a", eventId: null },
      ),
      true,
    );
    assert.equal(
      flyerComposerDraftMatchesContext(
        { organizationId: "org-a", approvalEventId: "evt-1" },
        { organizationId: "org-a", eventId: null },
      ),
      false,
    );
  });
});

describe("clearFlyerComposerLocalStorageOnSignOut", () => {
  it("removes flyer draft keys (scoped + legacy) and leaves unrelated keys", () => {
    withMockLocalStorage(
      {
        [`${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:org-a:evt-1`]: "{}",
        [`${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:org-b:no-event`]: "{}",
        [FLYER_COMPOSER_DRAFT_STORAGE_PREFIX]: "{}",
        [`${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:legacy-evt`]: "{}",
        "cos-unrelated-preference": "keep-me",
      },
      (store) => {
        clearFlyerComposerLocalStorageOnSignOut();
        assert.equal(store.size, 1);
        assert.equal(store.get("cos-unrelated-preference"), "keep-me");
      },
    );
  });
});

describe("flyer UI storage contract", () => {
  const flyerHtml = readFileSync(
    join(process.cwd(), "public/create-with-ai-flyer.html"),
    "utf8",
  );

  it("builds org+event keys and validates restore match in the static HTML", () => {
    assert.match(flyerHtml, /STORAGE_KEY_BASE\s*=\s*"hr-flyer-composer-draft"/);
    assert.match(flyerHtml, /NO_EVENT_SEGMENT\s*=\s*"no-event"/);
    assert.match(flyerHtml, /function draftStorageKey\s*\(/);
    assert.match(flyerHtml, /function draftMatchesContext\s*\(/);
    assert.match(flyerHtml, /function switchFlyerEventContext\s*\(/);
    assert.match(flyerHtml, /if\s*\(!state\.organizationId\)\s*return/);
    assert.match(
      flyerHtml,
      /draftMatchesContext\s*\(\s*d,\s*state\.organizationId,\s*state\.approvalEventId\s*\)/,
    );
    assert.match(flyerHtml, /Never adopt a different eventId from storage/);
  });

  it("keeps legacy helper list available for migration tests", () => {
    assert.deepEqual(flyerComposerLegacyDraftStorageKeys("evt-1"), [
      `${FLYER_COMPOSER_DRAFT_STORAGE_PREFIX}:evt-1`,
      FLYER_COMPOSER_DRAFT_STORAGE_PREFIX,
    ]);
  });
});
