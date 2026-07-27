import type { HomepageComposerState } from "@/lib/homepage-composer/types";

const DB_NAME = "heyralli-homepage-composer";
const DB_VERSION = 1;
const STORE = "drafts";

/** Envelope so we can pick the newest copy across IDB + localStorage. */
type DraftEnvelope = {
  v: 4;
  at: number;
  state: HomepageComposerState;
};

export type DraftSaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

function localStorageKey(organizationId: string | null): string {
  return `homepage-composer:v4:${organizationId ?? "local"}`;
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

function readLocalStorageRaw(organizationId: string | null): string | null {
  try {
    const org = organizationId ?? "local";
    return (
      localStorage.getItem(`homepage-composer:v4:${org}`) ||
      localStorage.getItem(`homepage-composer:v3:${org}`) ||
      localStorage.getItem(`homepage-composer:v2:${org}`) ||
      localStorage.getItem(`homepage-composer:v1:${org}`)
    );
  } catch {
    return null;
  }
}

function parseEnvelope(raw: string): {
  state: HomepageComposerState | null;
  at: number;
} {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as DraftEnvelope).v === 4 &&
      (parsed as DraftEnvelope).state &&
      typeof (parsed as DraftEnvelope).at === "number"
    ) {
      const env = parsed as DraftEnvelope;
      return { state: env.state, at: env.at };
    }
    // Legacy: raw HomepageComposerState
    if (
      parsed &&
      typeof parsed === "object" &&
      "header" in parsed &&
      "footer" in parsed &&
      "cards" in parsed
    ) {
      return { state: parsed as HomepageComposerState, at: 0 };
    }
  } catch {
    // ignore
  }
  return { state: null, at: 0 };
}

function slimForQuota(state: HomepageComposerState): HomepageComposerState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.imageUrl?.startsWith("data:")
        ? { ...card, imageUrl: null }
        : card,
    ),
  };
}

function writeLocalStorage(
  organizationId: string | null,
  envelope: DraftEnvelope,
): void {
  const key = localStorageKey(organizationId);
  const full = JSON.stringify(envelope);
  try {
    localStorage.setItem(key, full);
    return;
  } catch {
    // Quota: drop embedded data-URLs but keep titles/blurbs/links/dates.
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ ...envelope, state: slimForQuota(envelope.state) }),
      );
    } catch {
      // Best-effort only.
    }
  }
}

/** Load newest draft JSON string (compares IndexedDB vs localStorage by `at`). */
export async function loadComposerDraftRaw(
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
  // Prefer the newer envelope; if equal/legacy, prefer IDB (full artwork).
  if (ls.at > idb.at) return lsRaw;
  return idbRaw;
}

/**
 * Persist full draft (including uploaded artwork URLs / data URLs).
 * Writes localStorage synchronously first so a mid-navigation unmount cannot
 * cancel the only copy, then mirrors to IndexedDB for large payloads.
 */
export async function saveComposerDraft(
  organizationId: string | null,
  state: HomepageComposerState,
  savedAt: number = Date.now(),
): Promise<void> {
  const envelope: DraftEnvelope = { v: 4, at: savedAt, state };
  const raw = JSON.stringify(envelope);

  // Sync mirror first — survives cancelled timers / aborted async on navigate.
  writeLocalStorage(organizationId, envelope);

  try {
    await idbSet(organizationId, raw);
  } catch (idbError) {
    // localStorage already has a copy; only throw if that copy is missing.
    try {
      if (!localStorage.getItem(localStorageKey(organizationId))) {
        throw idbError instanceof Error
          ? idbError
          : new Error(
              "Could not save draft. Storage may be full — use Export to keep your work.",
            );
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Could not save")) {
        throw err;
      }
      throw idbError instanceof Error
        ? idbError
        : new Error(
            "Could not save draft. Storage may be full — use Export to keep your work.",
          );
    }
  }
}

/** Parse storage payload to composer state (v4 envelope or legacy raw). */
export function parseComposerDraftRaw(
  raw: string,
): HomepageComposerState | null {
  return parseEnvelope(raw).state;
}
