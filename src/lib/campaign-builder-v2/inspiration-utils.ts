/** Matches ARTWORK_V2_MAX_INSPIRATION_IMAGES — inlined to keep unit tests path-alias-free. */
const MAX_INSPIRATION_IMAGES = 10;

let inspirationIdSeq = 0;

/** File identity used to merge drops/picks without treating Safari copies as new files. */
export type InspirationFileIdentity = {
  name: string;
  size: number;
  lastModified: number;
};

/**
 * Browser DataTransfer shape. Safari on a `<button>` often reports the right
 * `files.length` while every index returns `files[0]` — prefer `items.getAsFile()`.
 */
export type InspirationDataTransferLike = {
  items?: ArrayLike<{ kind?: string; getAsFile?: () => File | null }>;
  files?: ArrayLike<File> | FileList | null;
};

/** Dedupes and caps reference URLs. Earlier URLs win when over the limit. */
export function capInspirationImageUrls(urls: string[]): string[] {
  const unique: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || unique.includes(trimmed)) {
      continue;
    }
    unique.push(trimmed);
    if (unique.length >= MAX_INSPIRATION_IMAGES) {
      break;
    }
  }
  return unique;
}

/**
 * Merges user inspiration with brand logos.
 * User inspiration is kept first so logos never evict loaded references.
 */
export function mergeInspirationImageUrls(
  inspirationUrls: string[],
  brandLogoUrls: string[],
): string[] {
  return capInspirationImageUrls([...inspirationUrls, ...brandLogoUrls]);
}

/** Stable key so the same dropped/picked file is not appended as extra tiles. */
export function inspirationFileKey(file: InspirationFileIdentity): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

/**
 * Unique tile id. `Date.now()` alone collides when five files are added in
 * one click, so React keys and upload completion then stamp the same preview
 * onto multiple slots.
 */
export function createInspirationImageId(prefix = "inspiration"): string {
  inspirationIdSeq += 1;
  const unique =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${inspirationIdSeq}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${unique}`;
}

/**
 * Snapshot every dropped file immediately. Prefer `items.getAsFile()` so Safari
 * does not reuse `files[0]` for the rest of the list.
 */
export function filesFromDataTransfer(
  transfer: InspirationDataTransferLike | null | undefined,
): File[] {
  if (!transfer) return [];
  const fromItems: File[] = [];
  const items = transfer.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.kind === "file" && typeof item.getAsFile === "function") {
        const file = item.getAsFile();
        if (file) fromItems.push(file);
      }
    }
  }
  if (fromItems.length > 0) return fromItems;
  return Array.from(transfer.files ?? []);
}

/**
 * Keep distinct incoming files, skip copies already attached, and cap remaining
 * slots. Earlier files win when the same name+size+lastModified appears twice.
 */
export function selectNewInspirationFiles<T extends InspirationFileIdentity>(
  incoming: T[],
  existingKeys: Iterable<string>,
  remainingSlots: number,
): T[] {
  if (remainingSlots <= 0) return [];
  const seen = new Set(existingKeys);
  const selected: T[] = [];
  for (const file of incoming) {
    if (selected.length >= remainingSlots) break;
    const key = inspirationFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(file);
  }
  return selected;
}
