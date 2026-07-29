import type {
  NewsletterBrandColors,
  NewsletterCalendarChip,
  NewsletterComposerEvent,
  NewsletterComposerState,
  NewsletterLayoutBlock,
  NewsletterLinkChip,
  NewsletterSocialLink,
  NewsletterSponsor,
  NewsletterStory,
  NewsletterVolunteerAsk,
} from "@/lib/newsletter-composer/types";

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const defaultColors: NewsletterBrandColors = {
  primary: "#0b2f5b",
  accent: "#2f9fb3",
  messageBar: "#f7c948",
  cta: "#d4a84b",
};

export const defaultSocials: NewsletterSocialLink[] = [
  {
    id: "ig",
    network: "instagram",
    label: "Instagram",
    url: "",
    enabled: true,
  },
  {
    id: "fb",
    network: "facebook",
    label: "Facebook",
    url: "",
    enabled: true,
  },
  {
    id: "web",
    network: "website",
    label: "Website",
    url: "",
    enabled: true,
  },
  {
    id: "x",
    network: "x",
    label: "X / Twitter",
    url: "",
    enabled: false,
  },
];

export const defaultHelpfulLinks: NewsletterLinkChip[] = [
  { id: "skyward", emoji: "📚", label: "Forms", url: "" },
  { id: "lunch", emoji: "🍎", label: "Payments", url: "" },
  { id: "cal", emoji: "📅", label: "Calendar", url: "" },
  { id: "site", emoji: "🏫", label: "Website", url: "" },
  { id: "vol", emoji: "🙌", label: "Volunteer hub", url: "" },
];

export function storyFromEvent(event: NewsletterComposerEvent): NewsletterStory {
  const meta = [event.date, event.time].filter(Boolean).join(" · ");
  return {
    id: `story-event-${event.id}`,
    source: "event",
    eventId: event.id,
    title: event.title,
    date: event.date || null,
    meta: meta || "Event",
    messaging:
      event.description?.trim().slice(0, 280) ||
      `${event.title} — details below.`,
    ctaLabel: event.volunteerSignupUrl ? "Sign up →" : "Learn more →",
    ctaUrl: event.volunteerSignupUrl || "",
    imageUrl: event.imageUrl,
    included: false,
    featured: false,
  };
}

function defaultCalendar(): NewsletterCalendarChip[] {
  return [];
}

export function formatCalendarChipLabel(
  event: Pick<NewsletterComposerEvent, "title" | "date" | "time">,
): string {
  if (!event.date) return event.title;
  const [y, m, d] = event.date.split("-").map((p) => parseInt(p, 10));
  const dt = new Date(y!, m! - 1, d!);
  const datePart = Number.isNaN(dt.getTime())
    ? event.date
    : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timePart = event.time?.trim() ? ` · ${event.time.trim()}` : "";
  return `${datePart}${timePart} · ${event.title}`;
}

export function calendarChipFromEvent(
  event: NewsletterComposerEvent,
): NewsletterCalendarChip {
  return {
    id: `cal-event-${event.id}`,
    label: formatCalendarChipLabel(event),
    eventId: event.id,
    date: event.date || null,
  };
}

export function volunteerAskFromEvent(
  event: NewsletterComposerEvent,
): NewsletterVolunteerAsk | null {
  const url = event.volunteerSignupUrl?.trim();
  if (!url) return null;
  return {
    id: `vol-event-${event.id}`,
    eventId: event.id,
    source: "event",
    title: event.title,
    date: event.date || null,
    details: event.description?.trim().slice(0, 160) || "Volunteer signup",
    signupUrl: url,
    imageUrl: event.imageUrl,
    included: false,
  };
}

export function volunteersFromEvents(
  events: NewsletterComposerEvent[],
): NewsletterVolunteerAsk[] {
  return events
    .map(volunteerAskFromEvent)
    .filter((v): v is NewsletterVolunteerAsk => Boolean(v));
}

function defaultSponsors(): NewsletterSponsor[] {
  return [
    {
      id: newId("sp"),
      name: "Featured community partner",
      note: "Thank-you line",
      url: "",
      imageUrl: null,
    },
  ];
}

function buildLayoutBlocks(stories: NewsletterStory[]): NewsletterLayoutBlock[] {
  const included = stories.filter((s) => s.included);
  const storyBlocks: NewsletterLayoutBlock[] = included.map((s) => ({
    id: `block-story-${s.id}`,
    kind: "story" as const,
    storyId: s.id,
    label: s.title,
    detail: s.featured ? "Featured story" : "Story",
  }));

  return [
    {
      id: "block-header",
      kind: "header",
      storyId: null,
      label: "Header / hero",
      detail: "Colors + optional image",
    },
    {
      id: "block-message",
      kind: "message",
      storyId: null,
      label: "Leadership message",
      detail: "Leadership welcome",
    },
    ...storyBlocks,
    {
      id: "block-calendar",
      kind: "calendar",
      storyId: null,
      label: "Upcoming calendar",
      detail: "Date chips",
    },
    {
      id: "block-volunteer",
      kind: "volunteer",
      storyId: null,
      label: "Volunteer asks",
      detail: "Signup links",
    },
    {
      id: "block-sponsors",
      kind: "sponsors",
      storyId: null,
      label: "Sponsorship area",
      detail: "Partners + Become a Sponsor",
    },
    {
      id: "block-links",
      kind: "links",
      storyId: null,
      label: "Helpful links",
      detail: "Quick pills",
    },
    {
      id: "block-cta",
      kind: "cta",
      storyId: null,
      label: "Get Involved CTA",
      detail: "Footer ask",
    },
    {
      id: "block-socials",
      kind: "socials",
      storyId: null,
      label: "Social footer",
      detail: "Instagram · Facebook · Website",
    },
  ];
}

/** Keep structure blocks; sync story blocks; always pin Header / hero first. */
export function syncLayoutWithStories(
  state: NewsletterComposerState,
): NewsletterLayoutBlock[] {
  const headerBlock: NewsletterLayoutBlock = {
    id: "block-header",
    kind: "header",
    storyId: null,
    label: "Header / hero",
    detail: "Fixed at top",
  };

  const nonStory = state.layoutBlocks.filter(
    (b) => b.kind !== "story" && b.kind !== "header",
  );
  const messageIdx = nonStory.findIndex((b) => b.kind === "message");
  const insertAt = messageIdx >= 0 ? messageIdx + 1 : 1;
  const included = state.stories.filter((s) => s.included);
  const storyBlocks: NewsletterLayoutBlock[] = included
    .map((s) => {
      const existing = state.layoutBlocks.find((b) => b.storyId === s.id);
      return (
        existing ?? {
          id: `block-story-${s.id}`,
          kind: "story" as const,
          storyId: s.id,
          label: s.title,
          detail: s.featured ? "Featured story" : "Story",
        }
      );
    })
    .map((b) => {
      const story = included.find((s) => s.id === b.storyId);
      if (!story) return b;
      return {
        ...b,
        label: story.title,
        detail: story.featured ? "Featured story" : "Story",
      };
    });

  const before = nonStory.slice(0, insertAt);
  const after = nonStory.slice(insertAt);
  return [headerBlock, ...before, ...storyBlocks, ...after];
}

/** Ordered blocks for export/preview — hero always first. */
export function orderedLayoutBlocks(
  state: NewsletterComposerState,
): NewsletterLayoutBlock[] {
  const synced = syncLayoutWithStories(state);
  const header = synced.find((b) => b.kind === "header");
  const rest = synced.filter((b) => b.kind !== "header");
  return header ? [header, ...rest] : rest;
}

export function buildInitialState(
  organizationName: string | null,
  events: NewsletterComposerEvent[],
): NewsletterComposerState {
  const stories = events.map(storyFromEvent);
  // Pre-include soonest 3 events as a helpful start
  const sorted = [...stories].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  sorted.slice(0, 3).forEach((s) => {
    s.included = true;
  });
  if (sorted[0]) sorted[0].featured = true;

  const org = organizationName?.trim() || "Your organization";
  const state: NewsletterComposerState = {
    subject: `${org} Newsletter — this month’s updates`,
    issueName: `${org} Newsletter`,
    fromName: org,
    colors: { ...defaultColors },
    headerImageUrl: null,
    leadershipNames: "",
    leadershipMessage:
      "Hello — here’s what’s happening this month. We’ve packed the must-knows below so you can skim and go.",
    ptoNote: "",
    stories,
    calendarChips: defaultCalendar(),
    volunteerAsks: volunteersFromEvents(events),
    sponsors: defaultSponsors(),
    sponsorCtaLabel: "Become a Sponsor →",
    sponsorCtaUrl: "",
    helpfulLinks: defaultHelpfulLinks.map((l) => ({ ...l })),
    socials: defaultSocials.map((s) => ({ ...s })),
    footerCtaHeadline: "Get Involved — we need you",
    footerCtaLabel: "Volunteer hub →",
    footerCtaUrl: "",
    footerFinePrint: `${org} · You’re receiving this as a community member.`,
    layoutBlocks: [],
  };
  state.layoutBlocks = buildLayoutBlocks(state.stories);
  return state;
}

export function normalizeComposerState(
  raw: unknown,
  organizationName: string | null,
  events: NewsletterComposerEvent[],
): NewsletterComposerState {
  const fallback = buildInitialState(organizationName, events);
  if (!raw || typeof raw !== "object") return fallback;
  const s = raw as Partial<NewsletterComposerState>;

  const eventStories = events.map(storyFromEvent);
  const savedStories = Array.isArray(s.stories) ? s.stories : [];
  const byEvent = new Map(
    savedStories
      .filter((x) => x && typeof x === "object" && x.eventId)
      .map((x) => [x.eventId as string, x as NewsletterStory]),
  );
  const manual = savedStories.filter(
    (x) => x && typeof x === "object" && x.source === "manual",
  ) as NewsletterStory[];

  const stories: NewsletterStory[] = [
    ...eventStories.map((fresh) => {
      const prev = byEvent.get(fresh.eventId!);
      if (!prev) return fresh;
      return {
        ...fresh,
        messaging: prev.messaging || fresh.messaging,
        ctaLabel: prev.ctaLabel || fresh.ctaLabel,
        ctaUrl: prev.ctaUrl || fresh.ctaUrl,
        included: Boolean(prev.included),
        featured: Boolean(prev.featured),
      };
    }),
    ...manual.map((m) => ({
      id: m.id || newId("manual"),
      source: "manual" as const,
      eventId: null,
      title: m.title || "Story",
      date: m.date ?? null,
      meta: m.meta || "Manual",
      messaging: m.messaging || "",
      ctaLabel: m.ctaLabel || "Learn more →",
      ctaUrl: m.ctaUrl || "",
      imageUrl: m.imageUrl ?? null,
      included: m.included !== false,
      featured: Boolean(m.featured),
    })),
  ];

  // Only one featured
  let sawFeatured = false;
  for (const story of stories) {
    if (story.featured && !sawFeatured) {
      sawFeatured = true;
    } else if (story.featured) {
      story.featured = false;
    }
  }

  const freshVols = volunteersFromEvents(events);
  const savedVols = Array.isArray(s.volunteerAsks) ? s.volunteerAsks : [];
  const volByEvent = new Map(
    savedVols
      .filter((v) => v && typeof v === "object" && v.eventId)
      .map((v) => [v.eventId as string, v as NewsletterVolunteerAsk]),
  );
  const manualVols = savedVols.filter(
    (v) => v && typeof v === "object" && (v.source === "manual" || !v.eventId),
  ) as NewsletterVolunteerAsk[];

  const volunteerAsks: NewsletterVolunteerAsk[] = [
    ...freshVols.map((fresh) => {
      const prev = volByEvent.get(fresh.eventId!);
      if (!prev) return fresh;
      return {
        ...fresh,
        details: prev.details || fresh.details,
        signupUrl: prev.signupUrl || fresh.signupUrl,
        included: Boolean(prev.included),
      };
    }),
    ...manualVols.map((v) => ({
      id: v.id || newId("vol"),
      eventId: null,
      source: "manual" as const,
      title: v.title || "Volunteer ask",
      date: v.date ?? null,
      details: v.details || "",
      signupUrl: v.signupUrl || "",
      imageUrl: v.imageUrl ?? null,
      included: v.included !== false,
    })),
  ];

  const merged: NewsletterComposerState = {
    ...fallback,
    ...s,
    colors: { ...defaultColors, ...(s.colors ?? {}) },
    stories,
    calendarChips: Array.isArray(s.calendarChips)
      ? s.calendarChips
          .filter((c) => c && typeof c === "object")
          .filter((c) => {
            // Drop the old placeholder chip
            const label = typeof c.label === "string" ? c.label : "";
            return label !== "Add key dates as chips";
          })
          .map((c) => ({
            id: c.id || newId("cal"),
            label: c.label || "Date",
            eventId: typeof c.eventId === "string" ? c.eventId : null,
            date: typeof c.date === "string" ? c.date : null,
          }))
      : fallback.calendarChips,
    volunteerAsks,
    sponsors: Array.isArray(s.sponsors)
      ? s.sponsors.map((sp) => ({
          id: sp.id || newId("sp"),
          name: sp.name || "Sponsor",
          note: sp.note || "",
          url: sp.url || "",
          imageUrl:
            typeof sp.imageUrl === "string" && sp.imageUrl.trim()
              ? sp.imageUrl
              : null,
        }))
      : fallback.sponsors,
    helpfulLinks: Array.isArray(s.helpfulLinks)
      ? s.helpfulLinks
      : fallback.helpfulLinks,
    socials: Array.isArray(s.socials) ? s.socials : fallback.socials,
    layoutBlocks: Array.isArray(s.layoutBlocks)
      ? s.layoutBlocks
      : fallback.layoutBlocks,
    headerImageUrl:
      typeof s.headerImageUrl === "string" ? s.headerImageUrl : null,
  };

  merged.layoutBlocks = syncLayoutWithStories(merged);
  return merged;
}
