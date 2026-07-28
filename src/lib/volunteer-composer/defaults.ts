import {
  averageHex,
  contrastingText,
} from "@/lib/homepage-composer/colors";
import { buildEventBlurb, formatEventWhen } from "@/lib/homepage-composer/blurbs";
import type {
  VolunteerComposerEvent,
  VolunteerComposerState,
  VolunteerFooterColors,
  VolunteerFooterConfig,
  VolunteerHeaderColors,
  VolunteerHeaderConfig,
  VolunteerOpportunity,
} from "@/lib/volunteer-composer/types";

export function defaultHeaderColors(): VolunteerHeaderColors {
  const backgroundStart = "#1a4a6e";
  const backgroundEnd = "#2a7a86";
  const buttonBackground = "#2f4a3c";
  return {
    backgroundStart,
    backgroundEnd,
    textColor: contrastingText(averageHex(backgroundStart, backgroundEnd)),
    buttonBackground,
    buttonText: contrastingText(buttonBackground),
  };
}

export function defaultFooterColors(): VolunteerFooterColors {
  const background = "#2f4a3c";
  const buttonBackground = "#f7c948";
  return {
    background,
    textColor: contrastingText(background),
    buttonBackground,
    buttonText: contrastingText(buttonBackground),
  };
}

export function defaultHowToSteps(): [string, string, string] {
  return [
    "Choose an opportunity — Browse events and programs below.",
    "View available times — Open a card to see positions and slots.",
    "Complete your sign-up — Add your name on SignUpGenius.",
  ];
}

export function defaultHeader(
  organizationName?: string | null,
): VolunteerHeaderConfig {
  const org = organizationName?.trim() || "Your organization";
  return {
    organizationLabel: org,
    title: "Volunteer With Us",
    intro:
      "Whether you have an hour to give or can help throughout the year, every volunteer makes a difference. Browse the opportunities below and choose the one that works best for your schedule.",
    buttonCount: 2,
    button1: { label: "Browse opportunities", url: "#opportunities" },
    button2: { label: "Contact volunteer chair", url: "" },
    howToSteps: defaultHowToSteps(),
    colors: defaultHeaderColors(),
  };
}

export function defaultFooter(
  organizationName?: string | null,
): VolunteerFooterConfig {
  const org = organizationName?.trim() || "our families";
  return {
    ctaTitle: `Thank you for giving your time to ${org}.`,
    ctaBody: "Questions? Reach out to your volunteer chair — we’re glad you’re here.",
    buttonCount: 1,
    button1: { label: "Email volunteer chair", url: "" },
    button2: { label: "Join our Facebook group", url: "" },
    colors: defaultFooterColors(),
  };
}

export function defaultOpportunitiesSectionTitle(): string {
  return "Current volunteer opportunities";
}

export function defaultOpportunitiesSectionSub(): string {
  return "New opportunities are added throughout the school year. Select an open role to sign up.";
}

const DEFAULT_EMOJIS = ["🤝", "🍎", "📚", "🎉", "🚌", "☕", "🙌", "⭐"];

export function opportunityFromEvent(
  event: VolunteerComposerEvent,
): VolunteerOpportunity {
  const signupUrl = event.volunteerSignupUrl?.trim() || "";
  return {
    id: `event-${event.id}`,
    source: "event",
    eventId: event.id,
    emoji: DEFAULT_EMOJIS[Math.abs(hashId(event.id)) % DEFAULT_EMOJIS.length]!,
    imageUrl: event.imageUrl?.trim() || null,
    title: event.title,
    blurb: buildEventBlurb(event),
    whenLabel: formatEventWhen(event.date, event.time),
    signupUrl,
    alwaysOn: false,
    startsOn: null,
    expiresOn: event.date || null,
  };
}

export function newCustomOpportunity(index = 0): VolunteerOpportunity {
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    id: `custom-${Date.now()}-${index}`,
    source: "custom",
    eventId: null,
    emoji: DEFAULT_EMOJIS[index % DEFAULT_EMOJIS.length]!,
    imageUrl: null,
    title: "New volunteer role",
    blurb: "Describe what helpers will do.",
    whenLabel: "Date TBD",
    signupUrl: "",
    alwaysOn: false,
    startsOn: ymd,
    expiresOn: null,
  };
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

/** Capitalize the detail after an em dash for customer-facing how-to copy. */
function capitalizeHowToLine(line: string): string {
  const parts = line.split("—");
  if (parts.length < 2) return line;
  const strong = (parts[0] || "").trimEnd();
  const detail = parts.slice(1).join("—").trim();
  if (!detail) return line;
  const capped = detail.charAt(0).toUpperCase() + detail.slice(1);
  return `${strong} — ${capped}`;
}

export function buildInitialState(
  events: VolunteerComposerEvent[],
  organizationName?: string | null,
): VolunteerComposerState {
  const upcoming = [...events]
    .filter((e) => Boolean(e.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return {
    header: defaultHeader(organizationName),
    footer: defaultFooter(organizationName),
    opportunitiesSectionTitle: defaultOpportunitiesSectionTitle(),
    opportunitiesSectionSub: defaultOpportunitiesSectionSub(),
    selectedEventIds: upcoming.map((e) => e.id),
    opportunities: upcoming.map(opportunityFromEvent),
  };
}

function asButton(
  raw: unknown,
  fallback: { label: string; url: string },
): { label: string; url: string } {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  return {
    label: String(o.label ?? fallback.label),
    url: String(o.url ?? fallback.url),
  };
}

function asOpportunity(raw: unknown): VolunteerOpportunity | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    source: o.source === "custom" ? "custom" : "event",
    eventId: o.eventId == null ? null : String(o.eventId),
    emoji: String(o.emoji ?? "🤝") || "🤝",
    imageUrl:
      o.imageUrl == null || o.imageUrl === ""
        ? null
        : String(o.imageUrl),
    title: String(o.title ?? ""),
    blurb: String(o.blurb ?? ""),
    whenLabel: String(o.whenLabel ?? ""),
    signupUrl: String(o.signupUrl ?? ""),
    alwaysOn: Boolean(o.alwaysOn),
    startsOn: o.startsOn == null || o.startsOn === "" ? null : String(o.startsOn),
    expiresOn:
      o.expiresOn == null || o.expiresOn === "" ? null : String(o.expiresOn),
  };
}

export function normalizeComposerState(
  raw: unknown,
  organizationName?: string | null,
): VolunteerComposerState | null {
  if (!raw || typeof raw !== "object") return null;
  const base = buildInitialState([], organizationName);
  const o = raw as Record<string, unknown>;

  const headerRaw =
    o.header && typeof o.header === "object"
      ? (o.header as Record<string, unknown>)
      : {};
  const footerRaw =
    o.footer && typeof o.footer === "object"
      ? (o.footer as Record<string, unknown>)
      : {};
  const hcRaw =
    headerRaw.colors && typeof headerRaw.colors === "object"
      ? (headerRaw.colors as Record<string, unknown>)
      : {};
  const fcRaw =
    footerRaw.colors && typeof footerRaw.colors === "object"
      ? (footerRaw.colors as Record<string, unknown>)
      : {};

  const howTo = Array.isArray(headerRaw.howToSteps)
    ? headerRaw.howToSteps.map((s) => capitalizeHowToLine(String(s ?? "")))
    : base.header.howToSteps;
  while (howTo.length < 3) howTo.push("");

  const opportunities = Array.isArray(o.opportunities)
    ? o.opportunities
        .map(asOpportunity)
        .filter((x): x is VolunteerOpportunity => Boolean(x))
    : base.opportunities;

  const selectedEventIds = Array.isArray(o.selectedEventIds)
    ? o.selectedEventIds.map((id) => String(id))
    : opportunities
        .filter((op) => op.eventId)
        .map((op) => op.eventId as string);

  const buttonCount = (n: unknown, fallback: 1 | 2): 1 | 2 => {
    if (n === undefined || n === null || n === "") return fallback;
    return Number(n) === 2 ? 2 : 1;
  };

  return {
    header: {
      organizationLabel: String(
        headerRaw.organizationLabel ?? base.header.organizationLabel,
      ),
      title: String(headerRaw.title ?? base.header.title),
      intro: String(headerRaw.intro ?? base.header.intro),
      buttonCount: buttonCount(headerRaw.buttonCount, base.header.buttonCount),
      button1: asButton(headerRaw.button1, base.header.button1),
      button2: asButton(headerRaw.button2, base.header.button2),
      howToSteps: [howTo[0]!, howTo[1]!, howTo[2]!],
      colors: {
        backgroundStart: String(
          hcRaw.backgroundStart ?? base.header.colors.backgroundStart,
        ),
        backgroundEnd: String(
          hcRaw.backgroundEnd ?? base.header.colors.backgroundEnd,
        ),
        textColor: String(hcRaw.textColor ?? base.header.colors.textColor),
        buttonBackground: String(
          hcRaw.buttonBackground ?? base.header.colors.buttonBackground,
        ),
        buttonText: String(
          hcRaw.buttonText ?? base.header.colors.buttonText,
        ),
      },
    },
    footer: {
      ctaTitle: String(footerRaw.ctaTitle ?? base.footer.ctaTitle),
      ctaBody: String(footerRaw.ctaBody ?? base.footer.ctaBody),
      buttonCount: buttonCount(footerRaw.buttonCount, base.footer.buttonCount),
      button1: asButton(footerRaw.button1, base.footer.button1),
      button2: asButton(footerRaw.button2, base.footer.button2),
      colors: {
        background: String(fcRaw.background ?? base.footer.colors.background),
        textColor: String(fcRaw.textColor ?? base.footer.colors.textColor),
        buttonBackground: String(
          fcRaw.buttonBackground ?? base.footer.colors.buttonBackground,
        ),
        buttonText: String(
          fcRaw.buttonText ?? base.footer.colors.buttonText,
        ),
      },
    },
    opportunitiesSectionTitle: String(
      o.opportunitiesSectionTitle ?? base.opportunitiesSectionTitle,
    ),
    opportunitiesSectionSub: String(
      o.opportunitiesSectionSub ?? base.opportunitiesSectionSub,
    ),
    selectedEventIds,
    opportunities,
  };
}
