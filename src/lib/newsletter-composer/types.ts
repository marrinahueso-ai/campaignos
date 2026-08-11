export type NewsletterComposerStep =
  | "header"
  | "message"
  | "stories"
  | "mustdos"
  | "footer"
  | "layout"
  | "preview";

export type NewsletterComposerEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  /** From the org's campaign event record — never invented. */
  location: string | null;
  imageUrl: string | null;
  volunteerSignupUrl: string;
};

export type NewsletterBrandColors = {
  primary: string;
  accent: string;
  messageBar: string;
  cta: string;
};

export type NewsletterStorySource = "event" | "homepage" | "manual";

export type NewsletterStory = {
  id: string;
  source: NewsletterStorySource;
  eventId: string | null;
  title: string;
  date: string | null;
  time: string | null;
  /** From the source event — never invented for manual stories. */
  location: string | null;
  /** Short meta line under title in picker */
  meta: string;
  /** Body copy parents read in the email */
  messaging: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string | null;
  /** Where the image itself links to — separate from the CTA button link. */
  imageLink: string;
  imageAlt: string;
  included: boolean;
  featured: boolean;
};

export type NewsletterVolunteerAsk = {
  id: string;
  /** From event volunteer page when pulled automatically */
  eventId: string | null;
  source: "event" | "manual";
  title: string;
  date: string | null;
  details: string;
  signupUrl: string;
  imageUrl: string | null;
  imageLink: string;
  imageAlt: string;
  included: boolean;
};

export type NewsletterCalendarChip = {
  id: string;
  label: string;
  /** From calendar event when selected; null for manual chips */
  eventId: string | null;
  date: string | null;
};

export type NewsletterSponsor = {
  id: string;
  name: string;
  note: string;
  url: string;
  /** Required logo / artwork for email display */
  imageUrl: string | null;
  /** Where the logo image itself links to — falls back to `url` when blank. */
  imageLink: string;
  imageAlt: string;
};

export type NewsletterSocialLink = {
  id: string;
  network: "instagram" | "facebook" | "website" | "x";
  label: string;
  url: string;
  enabled: boolean;
};

export type NewsletterLinkChip = {
  id: string;
  emoji: string;
  label: string;
  url: string;
};

export type NewsletterLayoutBlockKind =
  | "header"
  | "message"
  | "story"
  | "calendar"
  | "volunteer"
  | "sponsors"
  | "links"
  | "cta"
  | "socials";

export type NewsletterLayoutBlock = {
  id: string;
  kind: NewsletterLayoutBlockKind;
  /** For story blocks — story id */
  storyId: string | null;
  label: string;
  detail: string;
};

// ---------------------------------------------------------------------------
// Block Builder canvas — a richer, ordered block list that replaces the flat
// `layoutBlocks` sequence in the newer Block Builder UI. Content for the
// "From Hey Ralli" kinds keeps living in `stories` / `calendarChips` /
// `volunteerAsks` / `sponsors` (this just orders + configures how they show);
// "Add your own" kinds carry their own inline content on the block.
// ---------------------------------------------------------------------------

/** System kinds pull their content from existing composer sub-state. */
export type NewsletterSystemBlockKind =
  | "hero"
  | "message"
  | "event"
  | "calendar"
  | "volunteer"
  | "sponsors"
  | "links"
  | "cta"
  | "socials";

/** Freeform kinds carry their own content directly on the block. */
export type NewsletterCustomBlockKind =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "textImage"
  | "columns"
  | "grid"
  | "carousel"
  | "list"
  | "divider"
  | "spacer"
  | "footer";

export type NewsletterCanvasBlockKind =
  | NewsletterSystemBlockKind
  | NewsletterCustomBlockKind;

export type NewsletterEventBlockLayout =
  | "featured"
  | "card"
  | "artwork-only"
  | "compact";

export type NewsletterCanvasListItem = {
  id: string;
  text: string;
};

export type NewsletterCanvasColumn = {
  id: string;
  imageUrl: string | null;
  imageLink: string;
  imageAlt: string;
  heading: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
};

export type NewsletterCanvasBlock = {
  id: string;
  kind: NewsletterCanvasBlockKind;

  /** "event" blocks reference a story (event-sourced or manual) by id. */
  storyId: string | null;

  /** "event" block presentation — content itself stays on the story. */
  eventLayout: NewsletterEventBlockLayout;
  showArtwork: boolean;
  showDescription: boolean;
  showLocation: boolean;
  showVolunteerLink: boolean;

  /** "Add your own" inline content. */
  heading: string;
  text: string;
  imageUrl: string | null;
  imageLink: string;
  imageAlt: string;
  buttonLabel: string;
  buttonUrl: string;
  columns: NewsletterCanvasColumn[];
  items: NewsletterCanvasListItem[];
  spacingPx: number;
  backgroundColor: string | null;
};

export type NewsletterComposerState = {
  subject: string;
  issueName: string;
  fromName: string;
  colors: NewsletterBrandColors;
  headerImageUrl: string | null;
  headerImageLink: string;
  headerImageAlt: string;
  leadershipNames: string;
  leadershipMessage: string;
  ptoNote: string;
  stories: NewsletterStory[];
  calendarChips: NewsletterCalendarChip[];
  volunteerAsks: NewsletterVolunteerAsk[];
  sponsors: NewsletterSponsor[];
  sponsorCtaLabel: string;
  sponsorCtaUrl: string;
  helpfulLinks: NewsletterLinkChip[];
  socials: NewsletterSocialLink[];
  footerCtaHeadline: string;
  footerCtaLabel: string;
  footerCtaUrl: string;
  footerFinePrint: string;
  layoutBlocks: NewsletterLayoutBlock[];
  /**
   * Optional — the Block Builder canvas. When absent (older drafts),
   * `migrateLayoutToCanvasBlocks` derives it from `layoutBlocks` so old
   * drafts still open cleanly in the new builder.
   */
  canvasBlocks?: NewsletterCanvasBlock[];
};
