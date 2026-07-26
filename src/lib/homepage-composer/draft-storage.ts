import type { HomepageComposerState } from "@/lib/homepage-composer/types";

const DB_NAME = "heyralli-homepage-composer";
const DB_VERSION = 1;
const STORE = "drafts";

export type DraftSaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

function localStorageKey(organizationId: string | null): string {
  return `homepage-composer:v3:${organizationId ?? "local"}`;
}

function draftId(organizationId: string | null): string {
  return organizationId ?? "local";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open draft storage"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGet(organizationId: string | null): Promise<string | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
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

async function idbSet(
  organizationId: string | null,
  raw: string,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.put(raw, draftId(organizationId));
      req.onerror = () => reject(req.error ?? new Error("Draft write failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Draft write failed"));
    });
  } finally {
    db.close();
  }
}

function readLocalStorageFallback(organizationId: string | null): string | null {
  try {
    const org = organizationId ?? "local";
    return (
      localStorage.getItem(`homepage-composer:v3:${org}`) ||
      localStorage.getItem(`homepage-composer:v2:${org}`) ||
      localStorage.getItem(`homepage-composer:v1:${org}`)
    );
  } catch {
    return null;
  }
}

function writeLocalStorageMirror(
  organizationId: string | null,
  state: HomepageComposerState,
): void {
  // Mirror a slim copy so older tabs / recovery still find structure if IDB is wiped.
  const slim: HomepageComposerState = {
    ...state,
    cards: state.cards.map((card) =>
      card.imageUrl?.startsWith("data:")
        ? { ...card, imageUrl: null }
        : card,
    ),
  };
  try {
    localStorage.setItem(localStorageKey(organizationId), JSON.stringify(slim));
  } catch {
    // Best-effort only — IndexedDB is the source of truth.
  }
}

/** Load draft JSON string (IndexedDB first, then localStorage). */
export async function loadComposerDraftRaw(
  organizationId: string | null,
): Promise<string | null> {
  try {
    const fromIdb = await idbGet(organizationId);
    if (fromIdb) return fromIdb;
  } catch {
    // fall through
  }
  return readLocalStorageFallback(organizationId);
}

/** Persist full draft (including uploaded artwork data URLs) to IndexedDB. */
export async function saveComposerDraft(
  organizationId: string | null,
  state: HomepageComposerState,
): Promise<void> {
  const raw = JSON.stringify(state);
  try {
    await idbSet(organizationId, raw);
    writeLocalStorageMirror(organizationId, state);
    return;
  } catch (idbError) {
    // Last resort: try full localStorage (may fail on large artwork).
    try {
      localStorage.setItem(localStorageKey(organizationId), raw);
      return;
    } catch {
      writeLocalStorageMirror(organizationId, state);
      throw idbError instanceof Error
        ? idbError
        : new Error(
            "Could not save draft. Storage may be full — use Export to keep your work.",
          );
    }
  }
}
