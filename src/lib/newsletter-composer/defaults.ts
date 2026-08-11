import type {
  NewsletterBrandColors,
  NewsletterCalendarChip,
  NewsletterCanvasBlock,
  NewsletterCanvasBlockKind,
  NewsletterCanvasColumn,
  NewsletterCanvasListItem,
  NewsletterComposerEvent,
  NewsletterComposerState,
  NewsletterEventBlockLayout,
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
    time: event.time || null,
    location: event.location || null,
    meta: meta || "Event",
    messaging:
      event.description?.trim().slice(0, 280) ||
      `${event.title} — details below.`,
    ctaLabel: event.volunteerSignupUrl ? "Sign up →" : "Learn more →",
    ctaUrl: event.volunteerSignupUrl || "",
    imageUrl: event.imageUrl,
    imageLink: "",
    imageAlt: "",
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
    imageLink: "",
    imageAlt: "",
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
      imageLink: "",
      imageAlt: "",
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

// ---------------------------------------------------------------------------
// Block Builder canvas blocks
// ---------------------------------------------------------------------------

function newCanvasColumn(
  overrides: Partial<NewsletterCanvasColumn> = {},
): NewsletterCanvasColumn {
  return {
    id: newId("col"),
    imageUrl: null,
    imageLink: "",
    imageAlt: "",
    heading: "",
    text: "",
    buttonLabel: "",
    buttonUrl: "",
    ...overrides,
  };
}

function newCanvasListItem(text = ""): NewsletterCanvasListItem {
  return { id: newId("item"), text };
}

/** Fresh block with sensible per-kind defaults — used for both new inserts and normalization fallback. */
export function newCanvasBlock(
  kind: NewsletterCanvasBlockKind,
  overrides: Partial<NewsletterCanvasBlock> = {},
): NewsletterCanvasBlock {
  const base: NewsletterCanvasBlock = {
    id: newId(`block-${kind}`),
    kind,
    storyId: null,
    eventLayout: "featured",
    showArtwork: true,
    showDescription: true,
    showLocation: true,
    showVolunteerLink: true,
    heading: "",
    text: "",
    imageUrl: null,
    imageLink: "",
    imageAlt: "",
    buttonLabel: "",
    buttonUrl: "",
    columns: [],
    items: [],
    spacingPx: 24,
    backgroundColor: null,
  };

  switch (kind) {
    case "heading":
      base.heading = "New heading";
      break;
    case "text":
      base.text = "Add a paragraph of text…";
      break;
    case "button":
      base.buttonLabel = "Learn more →";
      break;
    case "textImage":
      base.heading = "New section";
      base.text = "Add a sentence or two of context…";
      break;
    case "columns":
      base.columns = [newCanvasColumn(), newCanvasColumn()];
      break;
    case "grid":
      base.columns = [newCanvasColumn(), newCanvasColumn(), newCanvasColumn(), newCanvasColumn()];
      break;
    case "carousel":
      base.columns = [newCanvasColumn(), newCanvasColumn(), newCanvasColumn()];
      break;
    case "list":
      base.heading = "Reminders";
      base.items = [newCanvasListItem("First reminder"), newCanvasListItem("Second reminder")];
      break;
    case "spacer":
      base.spacingPx = 24;
      break;
    default:
      break;
  }

  return { ...base, ...overrides };
}

/** Adds a new column/item/card to blocks that hold a list (columns, grid, carousel). */
export function addCanvasColumn(block: NewsletterCanvasBlock): NewsletterCanvasBlock {
  return { ...block, columns: [...block.columns, newCanvasColumn()] };
}

export function addCanvasListItem(block: NewsletterCanvasBlock): NewsletterCanvasBlock {
  return { ...block, items: [...block.items, newCanvasListItem()] };
}

/** Deep-cloned copy with fresh ids — used by "Duplicate block" in the canvas. */
export function duplicateCanvasBlock(block: NewsletterCanvasBlock): NewsletterCanvasBlock {
  return {
    ...block,
    id: newId(`block-${block.kind}`),
    columns: block.columns.map((c) => ({ ...c, id: newId("col") })),
    items: block.items.map((i) => ({ ...i, id: newId("item") })),
  };
}

/**
 * Derives canvas blocks from the legacy flat `layoutBlocks` + stories /
 * calendar / volunteer / sponsors sub-state — the "Standard School Update"
 * template order every draft starts from, and the fallback used to open
 * older drafts that predate the Block Builder canvas.
 */
export function migrateLayoutToCanvasBlocks(
  state: NewsletterComposerState,
): NewsletterCanvasBlock[] {
  const blocks = orderedLayoutBlocks(state);
  const canvasBlocks: NewsletterCanvasBlock[] = [];

  for (const block of blocks) {
    switch (block.kind) {
      case "header":
        canvasBlocks.push(newCanvasBlock("hero", { id: block.id }));
        break;
      case "message":
        if (state.leadershipMessage.trim()) {
          canvasBlocks.push(newCanvasBlock("message", { id: block.id }));
        }
        break;
      case "story": {
        const story = state.stories.find((s) => s.id === block.storyId);
        if (!story || !story.included) break;
        canvasBlocks.push(
          newCanvasBlock("event", {
            id: block.id,
            storyId: story.id,
            eventLayout: story.featured ? "featured" : "card",
          }),
        );
        break;
      }
      case "calendar":
        if (state.calendarChips.some((c) => c.label.trim())) {
          canvasBlocks.push(newCanvasBlock("calendar", { id: block.id }));
        }
        break;
      case "volunteer":
        if (state.volunteerAsks.some((v) => v.included)) {
          canvasBlocks.push(newCanvasBlock("volunteer", { id: block.id }));
        }
        break;
      case "sponsors":
        canvasBlocks.push(newCanvasBlock("sponsors", { id: block.id }));
        break;
      case "links":
        if (state.helpfulLinks.some((l) => l.label.trim())) {
          canvasBlocks.push(newCanvasBlock("links", { id: block.id }));
        }
        break;
      case "cta":
        canvasBlocks.push(newCanvasBlock("cta", { id: block.id }));
        break;
      case "socials":
        canvasBlocks.push(newCanvasBlock("socials", { id: block.id }));
        break;
      default:
        break;
    }
  }

  return canvasBlocks;
}

/** Standard School Update starter template — same order `buildInitialState` produces. */
export function buildStandardSchoolUpdateCanvasBlocks(
  state: NewsletterComposerState,
): NewsletterCanvasBlock[] {
  return migrateLayoutToCanvasBlocks(state);
}

function normalizeCanvasColumn(raw: unknown): NewsletterCanvasColumn | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<NewsletterCanvasColumn>;
  return {
    id: typeof c.id === "string" && c.id ? c.id : newId("col"),
    imageUrl: typeof c.imageUrl === "string" && c.imageUrl.trim() ? c.imageUrl : null,
    imageLink: typeof c.imageLink === "string" ? c.imageLink : "",
    imageAlt: typeof c.imageAlt === "string" ? c.imageAlt : "",
    heading: typeof c.heading === "string" ? c.heading : "",
    text: typeof c.text === "string" ? c.text : "",
    buttonLabel: typeof c.buttonLabel === "string" ? c.buttonLabel : "",
    buttonUrl: typeof c.buttonUrl === "string" ? c.buttonUrl : "",
  };
}

function normalizeCanvasListItem(raw: unknown): NewsletterCanvasListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const i = raw as Partial<NewsletterCanvasListItem>;
  return {
    id: typeof i.id === "string" && i.id ? i.id : newId("item"),
    text: typeof i.text === "string" ? i.text : "",
  };
}

const CANVAS_BLOCK_KINDS = new Set<NewsletterCanvasBlockKind>([
  "hero",
  "message",
  "event",
  "calendar",
  "volunteer",
  "sponsors",
  "links",
  "cta",
  "socials",
  "heading",
  "text",
  "image",
  "button",
  "textImage",
  "columns",
  "grid",
  "carousel",
  "list",
  "divider",
  "spacer",
  "footer",
]);

function normalizeCanvasBlock(raw: unknown): NewsletterCanvasBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<NewsletterCanvasBlock> & { kind?: unknown };
  const kind =
    typeof r.kind === "string" && CANVAS_BLOCK_KINDS.has(r.kind as NewsletterCanvasBlockKind)
      ? (r.kind as NewsletterCanvasBlockKind)
      : null;
  if (!kind) return null;

  const base = newCanvasBlock(
    kind,
    typeof r.id === "string" && r.id ? { id: r.id } : {},
  );

  return {
    ...base,
    storyId: typeof r.storyId === "string" ? r.storyId : base.storyId,
    eventLayout: (["featured", "card", "artwork-only", "compact"] as NewsletterEventBlockLayout[]).includes(
      r.eventLayout as NewsletterEventBlockLayout,
    )
      ? (r.eventLayout as NewsletterEventBlockLayout)
      : base.eventLayout,
    showArtwork: typeof r.showArtwork === "boolean" ? r.showArtwork : base.showArtwork,
    showDescription:
      typeof r.showDescription === "boolean" ? r.showDescription : base.showDescription,
    showLocation: typeof r.showLocation === "boolean" ? r.showLocation : base.showLocation,
    showVolunteerLink:
      typeof r.showVolunteerLink === "boolean" ? r.showVolunteerLink : base.showVolunteerLink,
    heading: typeof r.heading === "string" ? r.heading : base.heading,
    text: typeof r.text === "string" ? r.text : base.text,
    imageUrl: typeof r.imageUrl === "string" && r.imageUrl.trim() ? r.imageUrl : null,
    imageLink: typeof r.imageLink === "string" ? r.imageLink : base.imageLink,
    imageAlt: typeof r.imageAlt === "string" ? r.imageAlt : base.imageAlt,
    buttonLabel: typeof r.buttonLabel === "string" ? r.buttonLabel : base.buttonLabel,
    buttonUrl: typeof r.buttonUrl === "string" ? r.buttonUrl : base.buttonUrl,
    columns: Array.isArray(r.columns)
      ? r.columns
          .map(normalizeCanvasColumn)
          .filter((c): c is NewsletterCanvasColumn => Boolean(c))
      : base.columns,
    items: Array.isArray(r.items)
      ? r.items
          .map(normalizeCanvasListItem)
          .filter((i): i is NewsletterCanvasListItem => Boolean(i))
      : base.items,
    spacingPx: typeof r.spacingPx === "number" ? r.spacingPx : base.spacingPx,
    backgroundColor:
      typeof r.backgroundColor === "string" && r.backgroundColor.trim()
        ? r.backgroundColor
        : null,
  };
}

/**
 * Canvas blocks for the current state — from the saved array when present
 * and non-empty, otherwise migrated from `layoutBlocks` so older drafts
 * still open with an equivalent (editable) block sequence.
 */
export function ensureCanvasBlocks(
  state: NewsletterComposerState,
  rawCanvasBlocks?: unknown,
): NewsletterCanvasBlock[] {
  if (Array.isArray(rawCanvasBlocks) && rawCanvasBlocks.length > 0) {
    const normalized = rawCanvasBlocks
      .map(normalizeCanvasBlock)
      .filter((b): b is NewsletterCanvasBlock => Boolean(b));
    if (normalized.length > 0) return normalized;
  }
  return migrateLayoutToCanvasBlocks(state);
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
    issueName: `${org} Scoop`,
    issueEdition: "",
    fromName: org,
    colors: { ...defaultColors },
    headerImageUrl: null,
    headerImageLink: "",
    headerImageAlt: "",
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
    canvasBlocks: [],
  };
  state.layoutBlocks = buildLayoutBlocks(state.stories);
  state.canvasBlocks = buildStandardSchoolUpdateCanvasBlocks(state);
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
        imageLink: typeof prev.imageLink === "string" ? prev.imageLink : fresh.imageLink,
        imageAlt: typeof prev.imageAlt === "string" ? prev.imageAlt : fresh.imageAlt,
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
      time: typeof m.time === "string" ? m.time : null,
      location: typeof m.location === "string" ? m.location : null,
      meta: m.meta || "Manual",
      messaging: m.messaging || "",
      ctaLabel: m.ctaLabel || "Learn more →",
      ctaUrl: m.ctaUrl || "",
      imageUrl: m.imageUrl ?? null,
      imageLink: typeof m.imageLink === "string" ? m.imageLink : "",
      imageAlt: typeof m.imageAlt === "string" ? m.imageAlt : "",
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
        imageLink: typeof prev.imageLink === "string" ? prev.imageLink : fresh.imageLink,
        imageAlt: typeof prev.imageAlt === "string" ? prev.imageAlt : fresh.imageAlt,
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
      imageLink: typeof v.imageLink === "string" ? v.imageLink : "",
      imageAlt: typeof v.imageAlt === "string" ? v.imageAlt : "",
      included: v.included !== false,
    })),
  ];

  const merged: NewsletterComposerState = {
    ...fallback,
    ...s,
    colors: { ...defaultColors, ...(s.colors ?? {}) },
    issueName:
      typeof s.issueName === "string" && s.issueName.trim()
        ? s.issueName
        : fallback.issueName,
    issueEdition:
      typeof s.issueEdition === "string"
        ? s.issueEdition
        : fallback.issueEdition,
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
          imageLink: typeof sp.imageLink === "string" ? sp.imageLink : "",
          imageAlt: typeof sp.imageAlt === "string" ? sp.imageAlt : "",
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
    headerImageLink:
      typeof s.headerImageLink === "string" ? s.headerImageLink : "",
    headerImageAlt:
      typeof s.headerImageAlt === "string" ? s.headerImageAlt : "",
  };

  merged.layoutBlocks = syncLayoutWithStories(merged);
  merged.canvasBlocks = ensureCanvasBlocks(merged, s.canvasBlocks);

  // Older drafts used a single issueName with " · " between title and edition.
  if (!merged.issueEdition.trim() && merged.issueName.includes("·")) {
    const [title, ...rest] = merged.issueName.split("·");
    const edition = rest.join("·").trim();
    if (title?.trim() && edition) {
      merged.issueName = title.trim();
      merged.issueEdition = edition;
    }
  }

  return merged;
}
