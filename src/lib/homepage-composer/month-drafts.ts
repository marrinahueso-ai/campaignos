import type {
  HomepageAnnouncement,
  HomepageCard,
  HomepageComposerEvent,
  HomepageComposerState,
  HomepageFooterConfig,
  HomepageHeaderConfig,
  HomepageMonthCardsSnapshot,
  HomepageResourceLink,
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

function cloneAnnouncements(
  announcements: HomepageAnnouncement[],
): HomepageAnnouncement[] {
  return announcements.map((row) => ({ ...row }));
}

function cloneResources(
  resources: HomepageResourceLink[],
): HomepageResourceLink[] {
  return resources.map((row) => ({ ...row }));
}

function cloneHeaderChrome(
  header: Omit<HomepageHeaderConfig, "announcements">,
): Omit<HomepageHeaderConfig, "announcements"> {
  return {
    title: header.title,
    message: header.message,
    button1Label: header.button1Label,
    button1Url: header.button1Url,
    button2Label: header.button2Label,
    button2Url: header.button2Url,
    button3Label: header.button3Label,
    button3Url: header.button3Url,
    colors: { ...header.colors },
  };
}

function cloneFooter(footer: HomepageFooterConfig): HomepageFooterConfig {
  return {
    ctaTitle: footer.ctaTitle,
    ctaBody: footer.ctaBody,
    ctaButtonLabel: footer.ctaButtonLabel,
    ctaButtonUrl: footer.ctaButtonUrl,
    ctaButton2Label: footer.ctaButton2Label,
    ctaButton2Url: footer.ctaButton2Url,
    colors: { ...footer.colors },
  };
}

export function emptyMonthCards(): HomepageMonthCardsSnapshot {
  return { cards: [], selectedEventIds: [], announcements: [] };
}

export function cloneMonthSnapshot(
  snapshot: HomepageMonthCardsSnapshot,
): HomepageMonthCardsSnapshot {
  return {
    selectedEventIds: [...snapshot.selectedEventIds],
    cards: snapshot.cards.map((card) => ({ ...card })),
    announcements: cloneAnnouncements(snapshot.announcements ?? []),
    header: snapshot.header ? cloneHeaderChrome(snapshot.header) : undefined,
    footer: snapshot.footer ? cloneFooter(snapshot.footer) : undefined,
    cardsSectionTitle: snapshot.cardsSectionTitle,
    resources: snapshot.resources
      ? cloneResources(snapshot.resources)
      : undefined,
  };
}

export function snapshotFromState(
  state: Pick<
    HomepageComposerState,
    | "cards"
    | "selectedEventIds"
    | "header"
    | "footer"
    | "cardsSectionTitle"
    | "resources"
  >,
): HomepageMonthCardsSnapshot {
  const { announcements, ...headerChrome } = state.header;
  return {
    cards: state.cards.map((card) => ({ ...card })),
    selectedEventIds: [...state.selectedEventIds],
    announcements: cloneAnnouncements(announcements ?? []),
    header: cloneHeaderChrome(headerChrome),
    footer: cloneFooter(state.footer),
    cardsSectionTitle: state.cardsSectionTitle,
    resources: cloneResources(state.resources),
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

function stableAnnouncementKey(row: HomepageAnnouncement): string {
  return [
    row.id,
    row.emoji,
    row.text,
    row.startsOn ?? "",
    row.expiresOn ?? "",
    row.alwaysOn ? "1" : "0",
  ].join("\u0001");
}

function stableResourceKey(row: HomepageResourceLink): string {
  return [row.id, row.emoji, row.label, row.url].join("\u0001");
}

function stableHeaderChromeKey(
  header: Omit<HomepageHeaderConfig, "announcements"> | undefined,
): string {
  if (!header) return "";
  const c = header.colors;
  return [
    header.title,
    header.message,
    header.button1Label,
    header.button1Url,
    header.button2Label,
    header.button2Url,
    header.button3Label,
    header.button3Url,
    c.backgroundStart,
    c.backgroundEnd,
    c.textColor,
    c.buttonBackground,
    c.buttonText,
    c.announcementBackground,
    c.announcementText,
  ].join("\u0001");
}

function stableFooterKey(footer: HomepageFooterConfig | undefined): string {
  if (!footer) return "";
  const c = footer.colors;
  return [
    footer.ctaTitle,
    footer.ctaBody,
    footer.ctaButtonLabel,
    footer.ctaButtonUrl,
    footer.ctaButton2Label,
    footer.ctaButton2Url,
    c.background,
    c.textColor,
    c.buttonBackground,
    c.buttonText,
    c.resourceBackground,
    c.resourceText,
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
  const aAnns = a.announcements ?? [];
  const bAnns = b.announcements ?? [];
  if (aAnns.length !== bAnns.length) return false;
  for (let i = 0; i < a.selectedEventIds.length; i += 1) {
    if (a.selectedEventIds[i] !== b.selectedEventIds[i]) return false;
  }
  for (let i = 0; i < a.cards.length; i += 1) {
    if (stableCardKey(a.cards[i]!) !== stableCardKey(b.cards[i]!)) return false;
  }
  for (let i = 0; i < aAnns.length; i += 1) {
    if (stableAnnouncementKey(aAnns[i]!) !== stableAnnouncementKey(bAnns[i]!)) {
      return false;
    }
  }

  // Legacy snapshots omit chrome — only compare chrome when either side has it.
  const aHasChrome = Boolean(
    a.header || a.footer || a.cardsSectionTitle != null || a.resources,
  );
  const bHasChrome = Boolean(
    b.header || b.footer || b.cardsSectionTitle != null || b.resources,
  );
  if (aHasChrome || bHasChrome) {
    if ((a.cardsSectionTitle ?? "") !== (b.cardsSectionTitle ?? "")) {
      return false;
    }
    if (stableHeaderChromeKey(a.header) !== stableHeaderChromeKey(b.header)) {
      return false;
    }
    if (stableFooterKey(a.footer) !== stableFooterKey(b.footer)) {
      return false;
    }
    const aRes = a.resources ?? [];
    const bRes = b.resources ?? [];
    if (aRes.length !== bRes.length) return false;
    for (let i = 0; i < aRes.length; i += 1) {
      if (stableResourceKey(aRes[i]!) !== stableResourceKey(bRes[i]!)) {
        return false;
      }
    }
  }

  return true;
}

/** Write active cards + chrome into monthDrafts[workingMonth]. */
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

  // Legacy months without chrome keep the live chrome; months with chrome apply it.
  const hasChrome = Boolean(
    loaded.header ||
      loaded.footer ||
      loaded.cardsSectionTitle != null ||
      loaded.resources,
  );

  return {
    ...stashed,
    workingMonth: nextMonth,
    cards: loaded.cards,
    selectedEventIds: loaded.selectedEventIds,
    header: {
      ...(hasChrome && loaded.header
        ? { ...stashed.header, ...loaded.header }
        : stashed.header),
      announcements: cloneAnnouncements(loaded.announcements),
    },
    footer:
      hasChrome && loaded.footer
        ? cloneFooter(loaded.footer)
        : stashed.footer,
    cardsSectionTitle:
      hasChrome && typeof loaded.cardsSectionTitle === "string"
        ? loaded.cardsSectionTitle
        : stashed.cardsSectionTitle,
    resources:
      hasChrome && loaded.resources
        ? cloneResources(loaded.resources)
        : stashed.resources,
    monthDrafts: {
      ...stashed.monthDrafts,
      [nextMonth]: loaded,
    },
  };
}

/** Commit active month (cards + chrome) as the Copy-from source + “saved” snapshot. */
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
 * Seed the active month from another month’s saved snapshot (full homepage).
 * Marks the active month dirty until Save this month.
 */
export function copyMonthCardsFrom(
  state: HomepageComposerState,
  fromMonth: string,
): HomepageComposerState | null {
  const source = state.monthSaved[fromMonth];
  if (!source) return null;
  const copied = cloneMonthSnapshot(source);
  const hasChrome = Boolean(
    copied.header ||
      copied.footer ||
      copied.cardsSectionTitle != null ||
      copied.resources,
  );
  return {
    ...state,
    cards: copied.cards,
    selectedEventIds: copied.selectedEventIds,
    header: {
      ...(hasChrome && copied.header
        ? { ...state.header, ...copied.header }
        : state.header),
      announcements: cloneAnnouncements(copied.announcements),
    },
    footer:
      hasChrome && copied.footer
        ? cloneFooter(copied.footer)
        : state.footer,
    cardsSectionTitle:
      hasChrome && typeof copied.cardsSectionTitle === "string"
        ? copied.cardsSectionTitle
        : state.cardsSectionTitle,
    resources:
      hasChrome && copied.resources
        ? cloneResources(copied.resources)
        : state.resources,
    monthDrafts: {
      ...state.monthDrafts,
      [state.workingMonth]: cloneMonthSnapshot(copied),
    },
  };
}

function isMonthContentEmpty(state: HomepageComposerState): boolean {
  return (
    state.cards.length === 0 &&
    (state.header.announcements?.length ?? 0) === 0
  );
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
  const empty = isMonthContentEmpty(state);
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
    .filter((key) => {
      const snap = state.monthSaved[key];
      if (!snap) return false;
      return (
        snap.cards.length > 0 || (snap.announcements?.length ?? 0) > 0
      );
    })
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
      ...cloneMonthSnapshot(snapshot),
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
