export type NewsletterComposerStep =
  | "header"
  | "message"
  | "stories"
  | "mustdos"
  | "footer"
  | "layout"
  | "preview"
  | "send";

export type NewsletterComposerEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
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
  /** Short meta line under title in picker */
  meta: string;
  /** Body copy parents read in the email */
  messaging: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string | null;
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

export type NewsletterComposerState = {
  subject: string;
  issueName: string;
  fromName: string;
  colors: NewsletterBrandColors;
  headerImageUrl: string | null;
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
};
