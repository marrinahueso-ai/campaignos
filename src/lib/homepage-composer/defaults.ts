import {
  averageHex,
  contrastingText,
} from "@/lib/homepage-composer/colors";
import { buildEventBlurb } from "@/lib/homepage-composer/blurbs";
import type {
  HomepageAnnouncement,
  HomepageCard,
  HomepageComposerEvent,
  HomepageComposerState,
  HomepageFooterColors,
  HomepageFooterConfig,
  HomepageHeaderColors,
  HomepageHeaderConfig,
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

export function defaultAnnouncements(): HomepageAnnouncement[] {
  return [
    {
      id: "ann-1",
      emoji: "📅",
      text: "Important Date: August 10: Return to School",
    },
    {
      id: "ann-2",
      emoji: "🎉",
      text: "Back to School Fair: August 5",
    },
  ];
}

export function defaultHeader(
  organizationName?: string | null,
): HomepageHeaderConfig {
  const school = organizationName?.trim() || "our school";
  return {
    title: "Welcome, Explorer Families!",
    message: `We're so glad you're here! This page is your hub for school information, PTO updates, upcoming events, and opportunities to get involved at ${school}.`,
    button1Label: "Volunteer Sign Up",
    button1Url: "#",
    button2Label: "Become a Sponsor",
    button2Url: "#",
    announcements: defaultAnnouncements(),
    colors: defaultHeaderColors(),
  };
}

export function defaultFooter(): HomepageFooterConfig {
  return {
    ctaTitle: "Get Involved at EES",
    ctaBody:
      "Whether you have 30 minutes, a few hours, or want to lead a project, there is a place for everyone to help make this school year memorable.",
    ctaButtonLabel: "Find a Way to Help",
    ctaButtonUrl: "#",
    colors: defaultFooterColors(),
  };
}

export function defaultResources(): HomepageResourceLink[] {
  return [
    { id: "res-bus", emoji: "🚌", label: "Bus Routes", url: "" },
    { id: "res-lunch", emoji: "🍎", label: "Lunch Payments", url: "" },
    { id: "res-cash", emoji: "💳", label: "School Cash", url: "" },
    { id: "res-skyward", emoji: "📚", label: "Skyward", url: "" },
    { id: "res-wcs", emoji: "🏫", label: "WCS Website", url: "" },
    { id: "res-cal", emoji: "📅", label: "School Calendar", url: "" },
    { id: "res-vol", emoji: "🙌", label: "Volunteer Info", url: "" },
    { id: "res-parent", emoji: "⭐", label: "Parent Resources", url: "" },
    { id: "res-menu", emoji: "🥭", label: "Lunch Menu", url: "" },
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
        "Sponsorships help fund student programs, family events, teacher support, and enrichment all year.",
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
      title: "Grade Level Supply List",
      blurb:
        "Find your student's teacher-approved list by grade level to make shopping quick and easy.",
      imageUrl: null,
      linkUrl: "",
      linkLabel: "View Supply List →",
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

  return {
    header: defaultHeader(organizationName),
    footer: defaultFooter(),
    resources: defaultResources(),
    selectedEventIds: upcoming.map((e) => e.id),
    cards: [...evergreen.slice(0, 1), ...eventCards, ...evergreen.slice(1)],
  };
}

function migrateAnnouncements(header: Record<string, unknown>): HomepageAnnouncement[] {
  if (Array.isArray(header.announcements)) {
    return header.announcements as HomepageAnnouncement[];
  }
  const line1 = String(header.announcementLine1 ?? "").trim();
  const line2 = String(header.announcementLine2 ?? "").trim();
  const items: HomepageAnnouncement[] = [];
  if (line1) {
    const emojiMatch = line1.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
    items.push({
      id: "ann-legacy-1",
      emoji: emojiMatch?.[1] || "📅",
      text: line1.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, ""),
    });
  }
  if (line2) {
    const emojiMatch = line2.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
    items.push({
      id: "ann-legacy-2",
      emoji: emojiMatch?.[1] || "🎉",
      text: line2.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, ""),
    });
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

  return {
    header: {
      ...base.header,
      ...parsed.header,
      announcements: migrateAnnouncements(
        parsed.header as unknown as Record<string, unknown>,
      ),
      colors: { ...base.header.colors, ...parsed.header.colors },
    },
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
    cards: parsed.cards.map((card, i) => {
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
        // Older drafts omit linkLabel; default when a URL exists, else empty.
        linkLabel: rawLabel || (linkUrl ? "Learn More →" : ""),
        date: card.date ?? null,
        time: card.time ?? null,
        startsOn: card.startsOn ?? null,
        expiresOn: card.expiresOn ?? null,
        alwaysOn: Boolean(card.alwaysOn),
      };
    }),
  };
}
