/**
 * Volunteer Website Page Composer.
 * Builds a Volunteer With Us page: header, opportunities, footer, preview, export.
 */

export type VolunteerComposerStep =
  | "header"
  | "footer"
  | "opportunities"
  | "preview"
  | "export";

export type VolunteerComposerEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  imageUrl: string | null;
  volunteerSignupUrl: string;
};

export type VolunteerButton = {
  label: string;
  url: string;
};

export type VolunteerHeaderColors = {
  backgroundStart: string;
  backgroundEnd: string;
  textColor: string;
  buttonBackground: string;
  buttonText: string;
};

export type VolunteerFooterColors = {
  background: string;
  textColor: string;
  buttonBackground: string;
  buttonText: string;
};

export type VolunteerHeaderConfig = {
  organizationLabel: string;
  title: string;
  intro: string;
  buttonCount: 1 | 2;
  button1: VolunteerButton;
  button2: VolunteerButton;
  /** Three how-it-works lines (strong — detail). */
  howToSteps: [string, string, string];
  colors: VolunteerHeaderColors;
};

export type VolunteerFooterConfig = {
  ctaTitle: string;
  ctaBody: string;
  buttonCount: 1 | 2;
  button1: VolunteerButton;
  button2: VolunteerButton;
  colors: VolunteerFooterColors;
};

export type VolunteerOpportunitySource = "event" | "custom";

export type VolunteerOpportunity = {
  id: string;
  source: VolunteerOpportunitySource;
  eventId: string | null;
  emoji: string;
  /** Event / uploaded artwork URL for the card face; emoji is fallback. */
  imageUrl: string | null;
  title: string;
  blurb: string;
  /** Display date/time line on the card (e.g. "Aug 5 · 5:00 PM"). */
  whenLabel: string;
  signupUrl: string;
  alwaysOn: boolean;
  /** YYYY-MM-DD — show as open starting this day */
  startsOn: string | null;
  /** YYYY-MM-DD — open through this day */
  expiresOn: string | null;
};

export type VolunteerComposerState = {
  header: VolunteerHeaderConfig;
  footer: VolunteerFooterConfig;
  opportunitiesSectionTitle: string;
  opportunitiesSectionSub: string;
  selectedEventIds: string[];
  opportunities: VolunteerOpportunity[];
};

export type OpportunityVisibilityKey = "open" | "soon" | "closed";

export type OpportunityVisibility = {
  key: OpportunityVisibilityKey;
  label: string;
  /** False when outside the on/off window — card rolls off preview/export. */
  show: boolean;
  dimmed: boolean;
};
