/**
 * Shared browser draft store for Homepage / Newsletter composers.
 *
 * Writes localStorage synchronously first, then mirrors to IndexedDB.
 * Loads compare envelopes by `at` so Chrome cannot prefer a stale IDB copy
 * over a newer localStorage draft (and vice versa).
 */

export type DraftSaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

export type DraftEnvelope<T> = {
  v: number;
  at: number;
  state: T;
};

export type ComposerDraftStoreOptions<T> = {
  dbName: string;
  /** IndexedDB object store name. */
  storeName?: string;
  dbVersion?: number;
  /** Envelope `v` written on save. */
  envelopeVersion: number;
  localStorageKey: (organizationId: string | null) => string;
  /** Older LS keys to read when migrating. */
  legacyLocalStorageKeys?: (organizationId: string | null) => string[];
  /** True when parsed JSON is a bare state (pre-envelope). */
  isLegacyState: (parsed: unknown) => parsed is T;
  /** Quota fallback: shrink payload for localStorage only. */
  slimForQuota?: (state: T) => T;
  /**
   * When a newer LS draft won but lost fields (e.g. slimmed data: images),
   * merge recoverable fields from the older IDB state.
   */
  mergeFromOlder?: (newer: T, older: T) => T;
  draftId?: (organizationId: string | null) => string;
  saveErrorMessage?: string;
};

export type ComposerDraftStore<T> = {
  loadRaw: (organizationId: string | null) => Promise<string | null>;
  save: (
    organizationId: string | null,
    state: T,
    savedAt?: number,
  ) => Promise<void>;
  parseRaw: (raw: string) => T | null;
};

export function createComposerDraftStore<T>(
  options: ComposerDraftStoreOptions<T>,
): ComposerDraftStore<T> {
  const storeName = options.storeName ?? "drafts";
  const dbVersion = options.dbVersion ?? 1;
  const draftId =
    options.draftId ?? ((organizationId: string | null) => organizationId ?? "local");
  const saveErrorMessage =
    options.saveErrorMessage ??
    "Could not save draft. Storage may be full — use Export to keep your work.";

  function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const request = indexedDB.open(options.dbName, dbVersion);
      request.onerror = () =>
        reject(request.error ?? new Error("Could not open draft storage"));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
    });
  }

  async function idbGet(organizationId: string | null): Promise<string | null> {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(draftId(organizationId));
        req.onerror = () => reject(req.error ?? new Error("Draft read failed"));
        req.onsuccess = () => {
          const value = req.result;
          resolve(typeof value === "string" ? value : null);
        };
      });
    } finally {
      db.close();
    }
  }

  async function idbSetIfNewer(
    organizationId: string | null,
    raw: string,
    at: number,
  ): Promise<void> {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const key = draftId(organizationId);
        const getReq = store.get(key);
        getReq.onerror = () =>
          reject(getReq.error ?? new Error("Draft read failed"));
        getReq.onsuccess = () => {
          const existing = getReq.result;
          if (typeof existing === "string") {
            const existingAt = parseEnvelope(existing).at;
            if (existingAt > at) return;
          }
          const putReq = store.put(raw, key);
          putReq.onerror = () =>
            reject(putReq.error ?? new Error("Draft write failed"));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Draft write failed"));
      });
    } finally {
      db.close();
    }
  }

  function readLocalStorageRaw(organizationId: string | null): string | null {
    try {
      const primary = localStorage.getItem(options.localStorageKey(organizationId));
      if (primary) return primary;
      const legacyKeys = options.legacyLocalStorageKeys?.(organizationId) ?? [];
      for (const key of legacyKeys) {
        const value = localStorage.getItem(key);
        if (value) return value;
      }
      return null;
    } catch {
      return null;
    }
  }

  function parseEnvelope(raw: string): { state: T | null; at: number } {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as DraftEnvelope<T>).v === "number" &&
        (parsed as DraftEnvelope<T>).state &&
        typeof (parsed as DraftEnvelope<T>).at === "number"
      ) {
        const env = parsed as DraftEnvelope<T>;
        return { state: env.state, at: env.at };
      }
      if (options.isLegacyState(parsed)) {
        return { state: parsed, at: 0 };
      }
    } catch {
      // ignore
    }
    return { state: null, at: 0 };
  }

  function writeLocalStorage(
    organizationId: string | null,
    envelope: DraftEnvelope<T>,
  ): void {
    const key = options.localStorageKey(organizationId);
    try {
      localStorage.setItem(key, JSON.stringify(envelope));
      return;
    } catch {
      if (!options.slimForQuota) return;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            ...envelope,
            state: options.slimForQuota(envelope.state),
          }),
        );
      } catch {
        // Best-effort only.
      }
    }
  }

  function mergeArtworkFromIdb(newerRaw: string, idbRaw: string | null): string {
    if (!idbRaw || !options.mergeFromOlder) return newerRaw;
    const newer = parseEnvelope(newerRaw);
    const older = parseEnvelope(idbRaw);
    if (!newer.state || !older.state) return newerRaw;
    const mergedState = options.mergeFromOlder(newer.state, older.state);
    if (mergedState === newer.state) return newerRaw;
    const merged: DraftEnvelope<T> = {
      v: options.envelopeVersion,
      at: newer.at,
      state: mergedState,
    };
    return JSON.stringify(merged);
  }

  async function loadRaw(
    organizationId: string | null,
  ): Promise<string | null> {
    let idbRaw: string | null = null;
    try {
      idbRaw = await idbGet(organizationId);
    } catch {
      // fall through
    }
    const lsRaw = readLocalStorageRaw(organizationId);

    if (!idbRaw && !lsRaw) return null;
    if (idbRaw && !lsRaw) return idbRaw;
    if (!idbRaw && lsRaw) return lsRaw;

    const idb = parseEnvelope(idbRaw!);
    const ls = parseEnvelope(lsRaw!);
    // Prefer newer; tie / legacy → IDB (usually fuller artwork).
    if (ls.at > idb.at) return mergeArtworkFromIdb(lsRaw!, idbRaw);
    return idbRaw;
  }

  async function save(
    organizationId: string | null,
    state: T,
    savedAt: number = Date.now(),
  ): Promise<void> {
    const envelope: DraftEnvelope<T> = {
      v: options.envelopeVersion,
      at: savedAt,
      state,
    };
    const raw = JSON.stringify(envelope);

    writeLocalStorage(organizationId, envelope);

    try {
      const lsNow = readLocalStorageRaw(organizationId);
      if (lsNow) {
        const lsAt = parseEnvelope(lsNow).at;
        if (lsAt > savedAt) return;
      }
      await idbSetIfNewer(organizationId, raw, savedAt);
    } catch (idbError) {
      try {
        if (!localStorage.getItem(options.localStorageKey(organizationId))) {
          throw idbError instanceof Error
            ? idbError
            : new Error(saveErrorMessage);
        }
      } catch (err) {
        if (err instanceof Error && err.message === saveErrorMessage) {
          throw err;
        }
        if (
          err instanceof Error &&
          err.message.startsWith("Could not save draft")
        ) {
          throw err;
        }
        throw idbError instanceof Error
          ? idbError
          : new Error(saveErrorMessage);
      }
    }
  }

  function parseRaw(raw: string): T | null {
    return parseEnvelope(raw).state;
  }

  return { loadRaw, save, parseRaw };
}
