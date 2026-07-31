import type {
  HomepageCard,
  HomepageComposerEvent,
  HomepageComposerState,
  HomepageMonthCardsSnapshot,
} from "@/lib/homepage-composer/types";

export function currentMonthYyyyMm(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map((p) => parseInt(p, 10));
  if (!y || !m) return yyyyMm;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatMonthShort(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map((p) => parseInt(p, 10));
  if (!y || !m) return yyyyMm;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString("en-US", { month: "long" });
}

export function shiftMonth(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split("-").map((p) => parseInt(p, 10));
  if (!y || !m) return yyyyMm;
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export function emptyMonthCards(): HomepageMonthCardsSnapshot {
  return { cards: [], selectedEventIds: [] };
}

export function cloneMonthSnapshot(
  snapshot: HomepageMonthCardsSnapshot,
): HomepageMonthCardsSnapshot {
  return {
    selectedEventIds: [...snapshot.selectedEventIds],
    cards: snapshot.cards.map((card) => ({ ...card })),
  };
}

export function snapshotFromState(
  state: Pick<HomepageComposerState, "cards" | "selectedEventIds">,
): HomepageMonthCardsSnapshot {
  return {
    cards: state.cards.map((card) => ({ ...card })),
    selectedEventIds: [...state.selectedEventIds],
  };
}

function stableCardKey(card: HomepageCard): string {
  return [
    card.id,
    card.source,
    card.eventId ?? "",
    card.title,
    card.blurb,
    card.imageUrl ?? "",
    card.linkUrl,
    card.linkLabel,
    card.date ?? "",
    card.time ?? "",
    card.startsOn ?? "",
    card.expiresOn ?? "",
    card.alwaysOn ? "1" : "0",
  ].join("\u0001");
}

export function monthSnapshotsEqual(
  a: HomepageMonthCardsSnapshot | null | undefined,
  b: HomepageMonthCardsSnapshot | null | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.selectedEventIds.length !== b.selectedEventIds.length) return false;
  if (a.cards.length !== b.cards.length) return false;
  for (let i = 0; i < a.selectedEventIds.length; i += 1) {
    if (a.selectedEventIds[i] !== b.selectedEventIds[i]) return false;
  }
  for (let i = 0; i < a.cards.length; i += 1) {
    if (stableCardKey(a.cards[i]!) !== stableCardKey(b.cards[i]!)) return false;
  }
  return true;
}

/** Write active cards into monthDrafts[workingMonth]. */
export function stashWorkingMonth(
  state: HomepageComposerState,
): HomepageComposerState {
  return {
    ...state,
    monthDrafts: {
      ...state.monthDrafts,
      [state.workingMonth]: snapshotFromState(state),
    },
  };
}

export function switchWorkingMonth(
  state: HomepageComposerState,
  nextMonth: string,
): HomepageComposerState {
  if (!nextMonth || nextMonth === state.workingMonth) {
    return stashWorkingMonth(state);
  }
  const stashed = stashWorkingMonth(state);
  const next =
    stashed.monthDrafts[nextMonth] ??
    stashed.monthSaved[nextMonth] ??
    emptyMonthCards();
  const loaded = cloneMonthSnapshot(next);
  return {
    ...stashed,
    workingMonth: nextMonth,
    cards: loaded.cards,
    selectedEventIds: loaded.selectedEventIds,
    monthDrafts: {
      ...stashed.monthDrafts,
      [nextMonth]: loaded,
    },
  };
}

/** Commit active month cards as the Copy-from source + “saved” snapshot. */
export function saveWorkingMonth(
  state: HomepageComposerState,
): HomepageComposerState {
  const snapshot = snapshotFromState(state);
  return {
    ...state,
    monthDrafts: {
      ...state.monthDrafts,
      [state.workingMonth]: cloneMonthSnapshot(snapshot),
    },
    monthSaved: {
      ...state.monthSaved,
      [state.workingMonth]: cloneMonthSnapshot(snapshot),
    },
  };
}

/**
 * Seed the active month from another month’s saved snapshot.
 * Marks the active month dirty until Save this month.
 */
export function copyMonthCardsFrom(
  state: HomepageComposerState,
  fromMonth: string,
): HomepageComposerState | null {
  const source = state.monthSaved[fromMonth];
  if (!source) return null;
  const copied = cloneMonthSnapshot(source);
  return {
    ...state,
    cards: copied.cards,
    selectedEventIds: copied.selectedEventIds,
    monthDrafts: {
      ...state.monthDrafts,
      [state.workingMonth]: cloneMonthSnapshot(copied),
    },
  };
}

export function isWorkingMonthDirty(state: HomepageComposerState): boolean {
  const saved = state.monthSaved[state.workingMonth];
  return !monthSnapshotsEqual(snapshotFromState(state), saved);
}

export function isWorkingMonthSaved(state: HomepageComposerState): boolean {
  return Boolean(state.monthSaved[state.workingMonth]);
}

export function workingMonthStatus(
  state: HomepageComposerState,
): "saved" | "unsaved" | "empty" {
  const empty = state.cards.length === 0;
  if (isWorkingMonthDirty(state)) {
    return empty && !isWorkingMonthSaved(state) ? "empty" : "unsaved";
  }
  if (!isWorkingMonthSaved(state) && empty) return "empty";
  return "saved";
}

/** Months with a saved snapshot that can seed Copy from… */
export function savedMonthsForCopy(
  state: HomepageComposerState,
): Array<{ key: string; cardCount: number }> {
  return Object.keys(state.monthSaved)
    .filter((key) => key !== state.workingMonth)
    .filter((key) => (state.monthSaved[key]?.cards.length ?? 0) > 0)
    .sort()
    .map((key) => ({
      key,
      cardCount: state.monthSaved[key]!.cards.length,
    }));
}

/**
 * Month picker options: window around working/current month, plus any
 * months that already have drafts/saves or events.
 */
export function workspaceMonthOptions(
  events: HomepageComposerEvent[],
  state: Pick<
    HomepageComposerState,
    "workingMonth" | "monthDrafts" | "monthSaved"
  >,
  now: Date = new Date(),
): string[] {
  const keys = new Set<string>();
  const anchor = state.workingMonth || currentMonthYyyyMm(now);
  for (let delta = -3; delta <= 6; delta += 1) {
    keys.add(shiftMonth(anchor, delta));
  }
  keys.add(currentMonthYyyyMm(now));
  keys.add(state.workingMonth);
  for (const key of Object.keys(state.monthDrafts)) keys.add(key);
  for (const key of Object.keys(state.monthSaved)) keys.add(key);
  for (const event of events) {
    if (event.date && event.date.length >= 7) {
      keys.add(event.date.slice(0, 7));
    }
  }
  return [...keys].sort();
}

export function slimMonthCards(cards: HomepageCard[]): HomepageCard[] {
  return cards.map((card) =>
    card.imageUrl?.startsWith("data:")
      ? { ...card, imageUrl: null }
      : card,
  );
}

export function slimMonthMap(
  map: Record<string, HomepageMonthCardsSnapshot>,
): Record<string, HomepageMonthCardsSnapshot> {
  const next: Record<string, HomepageMonthCardsSnapshot> = {};
  for (const [key, snapshot] of Object.entries(map)) {
    next[key] = {
      selectedEventIds: [...snapshot.selectedEventIds],
      cards: slimMonthCards(snapshot.cards),
    };
  }
  return next;
}

function mergeCardArtwork(
  newer: HomepageCard[],
  older: HomepageCard[],
): HomepageCard[] {
  const artById = new Map(
    older.filter((c) => c.imageUrl).map((c) => [c.id, c.imageUrl] as const),
  );
  if (artById.size === 0) return newer;
  let changed = false;
  const cards = newer.map((card) => {
    if (card.imageUrl) return card;
    const fromOlder = artById.get(card.id);
    if (!fromOlder) return card;
    changed = true;
    return { ...card, imageUrl: fromOlder };
  });
  return changed ? cards : newer;
}

export function mergeMonthMapArtwork(
  newer: Record<string, HomepageMonthCardsSnapshot>,
  older: Record<string, HomepageMonthCardsSnapshot>,
): Record<string, HomepageMonthCardsSnapshot> {
  const keys = new Set([...Object.keys(newer), ...Object.keys(older)]);
  let changed = false;
  const next: Record<string, HomepageMonthCardsSnapshot> = { ...newer };
  for (const key of keys) {
    const n = newer[key];
    const o = older[key];
    if (!n && o) {
      next[key] = cloneMonthSnapshot(o);
      changed = true;
      continue;
    }
    if (!n || !o) continue;
    const cards = mergeCardArtwork(n.cards, o.cards);
    if (cards !== n.cards) {
      next[key] = { ...n, cards };
      changed = true;
    }
  }
  return changed ? next : newer;
}
