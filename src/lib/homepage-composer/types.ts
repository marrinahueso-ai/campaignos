export type HomepageComposerStep =
  | "header"
  | "footer"
  | "cards"
  | "preview"
  | "export";

export type HomepageComposerEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  imageUrl: string | null;
  /** From event Volunteer page (planning) or SignUpGenius — blank if none. */
  volunteerSignupUrl: string;
};

export type HomepageCardSource = "event" | "custom";

export type HomepageCard = {
  id: string;
  source: HomepageCardSource;
  eventId: string | null;
  title: string;
  blurb: string;
  imageUrl: string | null;
  linkUrl: string;
  /** CTA label on the card (e.g. "Learn More →"). Empty when unused. */
  linkLabel: string;
  /** YYYY-MM-DD — display date on the card face (not visibility scheduling) */
  date: string | null;
  /** Display time string — optional */
  time: string | null;
  /** YYYY-MM-DD — show starting this day (local midnight) */
  startsOn: string | null;
  /** YYYY-MM-DD — visible through this day, hide next midnight */
  expiresOn: string | null;
  alwaysOn: boolean;
};

export type HomepageResourceLink = {
  id: string;
  emoji: string;
  label: string;
  url: string;
};

export type HomepageAnnouncement = {
  id: string;
  emoji: string;
  text: string;
  /** YYYY-MM-DD — show starting this day (local midnight) */
  startsOn: string | null;
  /** YYYY-MM-DD — visible through this day, hide next midnight */
  expiresOn: string | null;
  /** When true, ignore startsOn/expiresOn (evergreen bar line). */
  alwaysOn: boolean;
};

export type HomepageHeaderColors = {
  backgroundStart: string;
  backgroundEnd: string;
  textColor: string;
  buttonBackground: string;
  buttonText: string;
  announcementBackground: string;
  announcementText: string;
};

export type HomepageFooterColors = {
  background: string;
  textColor: string;
  buttonBackground: string;
  buttonText: string;
  resourceBackground: string;
  resourceText: string;
};

export type HomepageHeaderConfig = {
  title: string;
  message: string;
  /** How many hero CTAs to show (2nd button fields stay in draft when set to 1). */
  buttonCount: 1 | 2;
  button1Label: string;
  button1Url: string;
  button2Label: string;
  button2Url: string;
  announcements: HomepageAnnouncement[];
  colors: HomepageHeaderColors;
};

export type HomepageFooterConfig = {
  ctaTitle: string;
  ctaBody: string;
  ctaButtonLabel: string;
  ctaButtonUrl: string;
  ctaButton2Label: string;
  ctaButton2Url: string;
  colors: HomepageFooterColors;
};

/**
 * Month-scoped homepage content (YYYY-MM): cards, event picks, announcement
 * bar lines, and full chrome (hero/footer copy + colors, section title,
 * resources). `header.announcements` mirrors the working month.
 */
export type HomepageMonthCardsSnapshot = {
  cards: HomepageCard[];
  selectedEventIds: string[];
  announcements: HomepageAnnouncement[];
  /** Hero chrome for this month (announcements live in `announcements`). */
  header?: Omit<HomepageHeaderConfig, "announcements">;
  footer?: HomepageFooterConfig;
  cardsSectionTitle?: string;
  resources?: HomepageResourceLink[];
};

export type HomepageComposerState = {
  header: HomepageHeaderConfig;
  footer: HomepageFooterConfig;
  /** Large heading above the event cards grid in preview/export */
  cardsSectionTitle: string;
  /** Helpful Resources quick links (emoji + label + url) */
  resources: HomepageResourceLink[];
  /**
   * Active “Working on” month (YYYY-MM). Cards, picks, announcements, and
   * chrome (header/footer/resources/section title) are for this month.
   */
  workingMonth: string;
  /** Selected event ids for the active working month */
  selectedEventIds: string[];
  /** Homepage cards for the active working month */
  cards: HomepageCard[];
  /** Working drafts keyed by YYYY-MM (includes active after stash/save). */
  monthDrafts: Record<string, HomepageMonthCardsSnapshot>;
  /**
   * Explicit “Save this month” snapshots — Copy from… sources and saved status.
   */
  monthSaved: Record<string, HomepageMonthCardsSnapshot>;
};
