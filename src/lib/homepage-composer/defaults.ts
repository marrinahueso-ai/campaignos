import {
  averageHex,
  contrastingText,
} from "@/lib/homepage-composer/colors";
import { buildEventBlurb } from "@/lib/homepage-composer/blurbs";
import {
  currentMonthYyyyMm,
  snapshotFromState,
} from "@/lib/homepage-composer/month-drafts";
import type {
  HomepageAnnouncement,
  HomepageCard,
  HomepageComposerEvent,
  HomepageComposerState,
  HomepageFooterColors,
  HomepageFooterConfig,
  HomepageHeaderColors,
  HomepageHeaderConfig,
  HomepageMonthCardsSnapshot,
  HomepageResourceLink,
} from "@/lib/homepage-composer/types";
import { normalizeHref } from "@/lib/homepage-composer/urls";

export function defaultHeaderColors(): HomepageHeaderColors {
  const backgroundStart = "#0b2f5b";
  const backgroundEnd = "#2f9fb3";
  const buttonBackground = "#f7c948";
  return {
    backgroundStart,
    backgroundEnd,
    textColor: contrastingText(averageHex(backgroundStart, backgroundEnd)),
    buttonBackground,
    buttonText: contrastingText(buttonBackground),
    announcementBackground: "#fff9e8",
    announcementText: "#0b2f5b",
  };
}

export function defaultFooterColors(): HomepageFooterColors {
  const background = "#f3fbfc";
  const buttonBackground = "#f7c948";
  const resourceBackground = "#eef8fa";
  return {
    background,
    textColor: "#0b2f5b",
    buttonBackground,
    buttonText: contrastingText(buttonBackground),
    resourceBackground,
    resourceText: "#0b2f5b",
  };
}

export function normalizeAnnouncement(
  raw: Partial<HomepageAnnouncement> & { id?: string; text?: string },
  index = 0,
): HomepageAnnouncement {
  const startsOn =
    typeof raw.startsOn === "string" && raw.startsOn.trim()
      ? raw.startsOn.trim()
      : null;
  const expiresOn =
    typeof raw.expiresOn === "string" && raw.expiresOn.trim()
      ? raw.expiresOn.trim()
      : null;
  const alwaysOn =
    typeof raw.alwaysOn === "boolean"
      ? raw.alwaysOn
      : !startsOn && !expiresOn;

  return {
    id: raw.id?.trim() || `ann-${index + 1}`,
    emoji: raw.emoji?.trim() || "📅",
    text: typeof raw.text === "string" ? raw.text : "",
    startsOn,
    expiresOn,
    alwaysOn,
  };
}

export function defaultAnnouncements(): HomepageAnnouncement[] {
  return [
    normalizeAnnouncement({
      id: "ann-1",
      emoji: "📅",
      text: "Important Date: August 10: Season Kickoff",
      alwaysOn: true,
    }),
    normalizeAnnouncement({
      id: "ann-2",
      emoji: "🎉",
      text: "Community Fair: August 5",
      alwaysOn: true,
    }),
  ];
}

export function defaultHeader(
  organizationName?: string | null,
): HomepageHeaderConfig {
  const org = organizationName?.trim() || "our organization";
  return {
    title: `Welcome to ${org}!`,
    message: `We're so glad you're here! This page is your hub for updates, upcoming events, and ways to get involved at ${org}.`,
    buttonCount: 2,
    button1Label: "Volunteer Sign Up",
    button1Url: "#",
    button2Label: "Become a Sponsor",
    button2Url: "#",
    announcements: defaultAnnouncements(),
    colors: defaultHeaderColors(),
  };
}

export function defaultCardsSectionTitle(): string {
  return "What’s Happening";
}

export function defaultFooter(): HomepageFooterConfig {
  return {
    ctaTitle: "Get Involved",
    ctaBody:
      "Whether you have 30 minutes, a few hours, or want to lead a project, there is a place for everyone to help make this year memorable.",
    ctaButtonLabel: "Find a Way to Help",
    ctaButtonUrl: "#",
    colors: defaultFooterColors(),
  };
}

export function defaultResources(): HomepageResourceLink[] {
  return [
    { id: "res-bus", emoji: "🚌", label: "Directions", url: "" },
    { id: "res-lunch", emoji: "🍎", label: "Payments", url: "" },
    { id: "res-cash", emoji: "💳", label: "Store", url: "" },
    { id: "res-skyward", emoji: "📚", label: "Forms", url: "" },
    { id: "res-wcs", emoji: "🏫", label: "Website", url: "" },
    { id: "res-cal", emoji: "📅", label: "Calendar", url: "" },
    { id: "res-vol", emoji: "🙌", label: "Volunteer Info", url: "" },
    { id: "res-parent", emoji: "⭐", label: "Helpful Resources", url: "" },
    { id: "res-menu", emoji: "🥭", label: "Menus", url: "" },
  ];
}

export function defaultEvergreenCards(): HomepageCard[] {
  return [
    {
      id: "custom-invest",
      source: "custom",
      eventId: null,
      title: "Invest in Our Why",
      blurb:
        "Sponsorships help fund programs, community events, and volunteer support all year.",
      imageUrl: null,
      linkUrl: "",
      linkLabel: "Learn More →",
      date: null,
      time: null,
      startsOn: null,
      expiresOn: null,
      alwaysOn: true,
    },
    {
      id: "custom-supplies",
      source: "custom",
      eventId: null,
      title: "Getting Started Guide",
      blurb:
        "Find the approved checklist by group to make prep quick and easy.",
      imageUrl: null,
      linkUrl: "",
      linkLabel: "View Guide →",
      date: null,
      time: null,
      startsOn: null,
      expiresOn: null,
      alwaysOn: true,
    },
  ];
}

export function cardFromEvent(event: HomepageComposerEvent): HomepageCard {
  const volunteerUrl = event.volunteerSignupUrl?.trim() || "";
  return {
    id: `event-${event.id}`,
    source: "event",
    eventId: event.id,
    title: event.title,
    blurb: buildEventBlurb(event),
    imageUrl: event.imageUrl,
    linkUrl: volunteerUrl,
    linkLabel: volunteerUrl ? "Volunteer →" : "",
    date: event.date,
    time: event.time,
    startsOn: null,
    expiresOn: event.date,
    alwaysOn: false,
  };
}

function normalizeMonthSnapshot(
  raw: unknown,
): HomepageMonthCardsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<HomepageMonthCardsSnapshot>;
  if (!Array.isArray(parsed.cards)) return null;
  return {
    selectedEventIds: Array.isArray(parsed.selectedEventIds)
      ? parsed.selectedEventIds.filter((id): id is string => typeof id === "string")
      : [],
    cards: parsed.cards.map((card, i) => normalizeCard(card, i)),
    announcements: Array.isArray(parsed.announcements)
      ? parsed.announcements.map((row, i) =>
          normalizeAnnouncement(
            (row && typeof row === "object"
              ? row
              : {}) as Partial<HomepageAnnouncement>,
            i,
          ),
        )
      : [],
  };
}

/** True when any month snapshot in the raw draft already stored announcements. */
function monthMapRawHasAnnouncementsField(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return Object.values(raw as Record<string, unknown>).some(
    (value) =>
      Boolean(value) &&
      typeof value === "object" &&
      Array.isArray(
        (value as Partial<HomepageMonthCardsSnapshot>).announcements,
      ),
  );
}

function normalizeCard(card: HomepageCard, i: number): HomepageCard {
  const cleanedLink = normalizeHref(card.linkUrl || "");
  const linkUrl = cleanedLink === "#" ? "" : cleanedLink;
  const rawLabel =
    typeof card.linkLabel === "string" ? card.linkLabel.trim() : "";
  return {
    id: card.id || `card-legacy-${i}`,
    source: card.source === "event" ? "event" : "custom",
    eventId: card.eventId ?? null,
    title: card.title || "Untitled card",
    blurb: card.blurb || "",
    imageUrl: card.imageUrl ?? null,
    linkUrl,
    linkLabel: rawLabel || (linkUrl ? "Learn More →" : ""),
    date: card.date ?? null,
    time: card.time ?? null,
    startsOn: card.startsOn ?? null,
    expiresOn: card.expiresOn ?? null,
    alwaysOn: Boolean(card.alwaysOn),
  };
}

function normalizeMonthMap(
  raw: unknown,
): Record<string, HomepageMonthCardsSnapshot> {
  if (!raw || typeof raw !== "object") return {};
  const next: Record<string, HomepageMonthCardsSnapshot> = {};
  for (const [key, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const snapshot = normalizeMonthSnapshot(value);
    if (snapshot) next[key] = snapshot;
  }
  return next;
}

export function buildInitialState(
  events: HomepageComposerEvent[],
  organizationName?: string | null,
): HomepageComposerState {
  const upcoming = [...events]
    .filter((e) => Boolean(e.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const eventCards = upcoming.map(cardFromEvent);
  const evergreen = defaultEvergreenCards();
  const workingMonth = currentMonthYyyyMm();
  const cards = [...evergreen.slice(0, 1), ...eventCards, ...evergreen.slice(1)];
  const selectedEventIds = upcoming.map((e) => e.id);
  const header = defaultHeader(organizationName);
  const monthSnapshot: HomepageMonthCardsSnapshot = {
    cards: cards.map((card) => ({ ...card })),
    selectedEventIds: [...selectedEventIds],
    announcements: header.announcements.map((row) => ({ ...row })),
  };

  return {
    header,
    footer: defaultFooter(),
    cardsSectionTitle: defaultCardsSectionTitle(),
    resources: defaultResources(),
    workingMonth,
    selectedEventIds,
    cards,
    monthDrafts: { [workingMonth]: monthSnapshot },
    monthSaved: {},
  };
}

function migrateAnnouncements(header: Record<string, unknown>): HomepageAnnouncement[] {
  if (Array.isArray(header.announcements)) {
    return header.announcements.map((row, i) =>
      normalizeAnnouncement(
        (row && typeof row === "object"
          ? row
          : {}) as Partial<HomepageAnnouncement>,
        i,
      ),
    );
  }
  const line1 = String(header.announcementLine1 ?? "").trim();
  const line2 = String(header.announcementLine2 ?? "").trim();
  const items: HomepageAnnouncement[] = [];
  if (line1) {
    const emojiMatch = line1.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
    items.push(
      normalizeAnnouncement({
        id: "ann-legacy-1",
        emoji: emojiMatch?.[1] || "📅",
        text: line1.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, ""),
        alwaysOn: true,
      }),
    );
  }
  if (line2) {
    const emojiMatch = line2.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
    items.push(
      normalizeAnnouncement({
        id: "ann-legacy-2",
        emoji: emojiMatch?.[1] || "🎉",
        text: line2.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, ""),
        alwaysOn: true,
      }),
    );
  }
  return items.length ? items : defaultAnnouncements();
}

/** Merge older local drafts that predate colors / announcements array. */
export function normalizeComposerState(
  raw: unknown,
  organizationName?: string | null,
): HomepageComposerState | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<HomepageComposerState> & {
    footer?: HomepageFooterConfig & {
      resources?: HomepageResourceLink[];
    };
    header?: HomepageHeaderConfig & Record<string, unknown>;
  };
  if (!parsed.header || !parsed.footer || !Array.isArray(parsed.cards)) {
    return null;
  }

  const base = buildInitialState([], organizationName);
  const legacyResources = Array.isArray(parsed.footer.resources)
    ? parsed.footer.resources.map((r, i) => ({
        id: r.id || `res-legacy-${i}`,
        emoji: r.emoji || "🔗",
        label: r.label || "Link",
        url: r.url || "#",
      }))
    : null;

  const rawButtonCount = (parsed.header as { buttonCount?: unknown }).buttonCount;
  const inferredButtonCount: 1 | 2 =
    rawButtonCount === 1 || rawButtonCount === 2
      ? rawButtonCount
      : String(parsed.header.button2Label ?? "").trim()
        ? 2
        : 1;

  const normalized: HomepageComposerState = {
    header: {
      ...base.header,
      ...parsed.header,
      buttonCount: inferredButtonCount,
      announcements: migrateAnnouncements(
        parsed.header as unknown as Record<string, unknown>,
      ),
      colors: { ...base.header.colors, ...parsed.header.colors },
    },
    cardsSectionTitle:
      typeof parsed.cardsSectionTitle === "string" &&
      parsed.cardsSectionTitle.trim()
        ? parsed.cardsSectionTitle
        : base.cardsSectionTitle,
    footer: {
      ctaTitle: parsed.footer.ctaTitle ?? base.footer.ctaTitle,
      ctaBody: parsed.footer.ctaBody ?? base.footer.ctaBody,
      ctaButtonLabel: parsed.footer.ctaButtonLabel ?? base.footer.ctaButtonLabel,
      ctaButtonUrl: parsed.footer.ctaButtonUrl ?? base.footer.ctaButtonUrl,
      colors: { ...base.footer.colors, ...parsed.footer.colors },
    },
    resources: (Array.isArray(parsed.resources)
      ? parsed.resources
      : (legacyResources ?? base.resources)
    ).map((r, i) => ({
      id: r.id || `res-${i}`,
      emoji: r.emoji || "🔗",
      label: r.label || "Link",
      // Strip accidental "#https://…" left over from the old "#" placeholder.
      url: (() => {
        const cleaned = normalizeHref(r.url || "");
        return cleaned === "#" ? "" : cleaned;
      })(),
    })),
    selectedEventIds: Array.isArray(parsed.selectedEventIds)
      ? parsed.selectedEventIds
      : [],
    cards: parsed.cards.map((card, i) => normalizeCard(card, i)),
    workingMonth:
      typeof parsed.workingMonth === "string" &&
      /^\d{4}-\d{2}$/.test(parsed.workingMonth)
        ? parsed.workingMonth
        : currentMonthYyyyMm(),
    monthDrafts: normalizeMonthMap(parsed.monthDrafts),
    monthSaved: normalizeMonthMap(parsed.monthSaved),
  };

  // Legacy drafts (no month maps): treat current cards as this month’s draft + save.
  const hasMonthData =
    Object.keys(normalized.monthDrafts).length > 0 ||
    Object.keys(normalized.monthSaved).length > 0;
  if (!hasMonthData) {
    const snapshot = snapshotFromState(normalized);
    normalized.monthDrafts = { [normalized.workingMonth]: snapshot };
    normalized.monthSaved = {
      [normalized.workingMonth]: snapshotFromState(normalized),
    };
  } else if (!normalized.monthDrafts[normalized.workingMonth]) {
    normalized.monthDrafts = {
      ...normalized.monthDrafts,
      [normalized.workingMonth]: snapshotFromState(normalized),
    };
  }

  // Pre-month-announcements drafts: announcements lived only on header.
  const hadMonthAnnouncements =
    monthMapRawHasAnnouncementsField(parsed.monthDrafts) ||
    monthMapRawHasAnnouncementsField(parsed.monthSaved);
  if (!hadMonthAnnouncements) {
    const seeded = normalized.header.announcements.map((row) => ({ ...row }));
    const wm = normalized.workingMonth;
    const draft = normalized.monthDrafts[wm];
    if (draft) {
      normalized.monthDrafts = {
        ...normalized.monthDrafts,
        [wm]: { ...draft, announcements: seeded },
      };
    }
    const saved = normalized.monthSaved[wm];
    if (saved) {
      normalized.monthSaved = {
        ...normalized.monthSaved,
        [wm]: { ...saved, announcements: seeded.map((row) => ({ ...row })) },
      };
    }
  }

  // Active header announcements always mirror the working month snapshot.
  const activeMonth = normalized.monthDrafts[normalized.workingMonth];
  if (activeMonth) {
    normalized.header = {
      ...normalized.header,
      announcements: activeMonth.announcements.map((row) => ({ ...row })),
    };
  }

  return normalized;
}
