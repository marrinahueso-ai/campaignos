import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";

const DB_NAME = "heyralli-newsletter-composer";
const DB_VERSION = 1;
const STORE = "drafts";

export type DraftSaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

function localStorageKey(organizationId: string | null): string {
  return `newsletter-composer:v1:${organizationId ?? "local"}`;
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

export async function loadComposerDraftRaw(
  organizationId: string | null,
): Promise<string | null> {
  try {
    const fromIdb = await idbGet(organizationId);
    if (fromIdb) return fromIdb;
  } catch {
    /* fall through */
  }
  try {
    return localStorage.getItem(localStorageKey(organizationId));
  } catch {
    return null;
  }
}

export async function saveComposerDraft(
  organizationId: string | null,
  state: NewsletterComposerState,
): Promise<void> {
  const raw = JSON.stringify(state);
  try {
    localStorage.setItem(localStorageKey(organizationId), raw);
  } catch {
    /* ignore quota */
  }
  try {
    await idbSet(organizationId, raw);
  } catch {
    /* IDB optional */
  }
}
