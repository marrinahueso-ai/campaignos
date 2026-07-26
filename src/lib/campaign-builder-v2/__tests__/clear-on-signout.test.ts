import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clearLocalCampaignBuilderStorageOnSignOut } from "../clear-on-signout.ts";
import { LOCAL_SESSION_KEY_PREFIX, localSessionKey } from "../seed-data.ts";
import { ARTWORK_BACKUP_KEY_PREFIX, artworkBackupKey } from "../artwork-backup.ts";

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

describe("clearLocalCampaignBuilderStorageOnSignOut", () => {
  it("removes campaign-builder session + artwork backup keys, leaves everything else", () => {
    withMockLocalStorage(
      {
        [localSessionKey("evt-a")]: "{}",
        [artworkBackupKey("evt-a")]: "{}",
        [localSessionKey("evt-b")]: "{}",
        "cos-last-event:org-1": "evt-a",
        "cos-sidebar-collapsed": "true",
      },
      (store) => {
        clearLocalCampaignBuilderStorageOnSignOut();

        assert.equal(store.has(localSessionKey("evt-a")), false);
        assert.equal(store.has(artworkBackupKey("evt-a")), false);
        assert.equal(store.has(localSessionKey("evt-b")), false);
        assert.equal(store.has("cos-last-event:org-1"), true);
        assert.equal(store.has("cos-sidebar-collapsed"), true);
      },
    );
  });

  it("is a no-op when window/localStorage is unavailable (SSR, private mode)", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    try {
      assert.doesNotThrow(() => clearLocalCampaignBuilderStorageOnSignOut());
    } finally {
      if (previousWindow !== undefined) {
        (globalThis as { window: unknown }).window = previousWindow;
      }
    }
  });

  it("exposes the same prefixes the key builders use", () => {
    assert.equal(localSessionKey("x").startsWith(LOCAL_SESSION_KEY_PREFIX), true);
    assert.equal(artworkBackupKey("x").startsWith(ARTWORK_BACKUP_KEY_PREFIX), true);
  });
});
