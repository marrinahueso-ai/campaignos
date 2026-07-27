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
  colors: HomepageFooterColors;
};

export type HomepageComposerState = {
  header: HomepageHeaderConfig;
  footer: HomepageFooterConfig;
  /** Helpful Resources quick links (emoji + label + url) */
  resources: HomepageResourceLink[];
  /** Selected event ids (from Create with AI / calendar events) */
  selectedEventIds: string[];
  cards: HomepageCard[];
};
