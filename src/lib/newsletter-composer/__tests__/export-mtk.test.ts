import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildInitialState } from "@/lib/newsletter-composer/defaults";
import { exportNewsletterMtk } from "@/lib/newsletter-composer/export-mtk";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";

function fixtureState(): NewsletterComposerState {
  const state = buildInitialState("Lincoln PTO", [
    {
      id: "evt-fridge",
      title: "Stock the Fridge",
      description: "Help restock snacks for volunteers.",
      date: "2026-08-15",
      time: "09:00",
      imageUrl: "https://cdn.example/fridge.jpg",
      volunteerSignupUrl: "https://example.com/signup/fridge",
    },
    {
      id: "evt-fair",
      title: "Book Fair",
      description: "Family night at the book fair.",
      date: "2026-08-22",
      time: null,
      imageUrl: "https://cdn.example/fair.jpg",
      volunteerSignupUrl: "",
    },
  ]);

  state.headerImageUrl = "https://cdn.example/header.png";
  state.leadershipNames = "Maria & Jordan";
  state.leadershipMessage = "Welcome back — here’s what’s coming up.";
  state.ptoNote = "Office closed Aug 1.";

  const fridge = state.stories.find((s) => s.eventId === "evt-fridge")!;
  const fair = state.stories.find((s) => s.eventId === "evt-fair")!;
  fridge.included = true;
  fridge.featured = true;
  fridge.ctaLabel = "Sign up →";
  fridge.ctaUrl = "https://example.com/signup/fridge";
  fair.included = true;
  fair.featured = false;
  fair.ctaLabel = "Learn more →";
  fair.ctaUrl = "example.com/bookfair";

  state.calendarChips = [
    {
      id: "chip-1",
      label: "Aug 15 · Stock the Fridge",
      eventId: "evt-fridge",
      date: "2026-08-15",
    },
  ];

  state.volunteerAsks = [
    {
      id: "vol-1",
      eventId: "evt-fridge",
      source: "event",
      title: "Fridge restock",
      date: "2026-08-15",
      details: "Bring non-perishable snacks.",
      signupUrl: "https://example.com/signup/fridge",
      imageUrl: "https://cdn.example/vol.jpg",
      included: true,
    },
  ];

  state.sponsors = [
    {
      id: "sp-1",
      name: "Local Market",
      note: "Snack partner",
      url: "https://localmarket.example",
      imageUrl: "https://cdn.example/sponsor.png",
    },
  ];

  state.helpfulLinks = [
    {
      id: "lnk-1",
      emoji: "📅",
      label: "Calendar",
      url: "https://example.com/calendar",
    },
  ];

  state.footerCtaHeadline = "Get Involved — we need you";
  state.footerCtaLabel = "Volunteer hub →";
  state.footerCtaUrl = "https://example.com/volunteer";
  state.socials = state.socials.map((s) =>
    s.network === "instagram"
      ? { ...s, enabled: true, url: "https://instagram.com/lincolnpto" }
      : { ...s, enabled: false },
  );

  state.layoutBlocks = [
    {
      id: "b-header",
      kind: "header",
      storyId: null,
      label: "Header",
      detail: "",
    },
    {
      id: "b-message",
      kind: "message",
      storyId: null,
      label: "Message",
      detail: "",
    },
    {
      id: "b-story-fridge",
      kind: "story",
      storyId: fridge.id,
      label: fridge.title,
      detail: "Featured",
    },
    {
      id: "b-story-fair",
      kind: "story",
      storyId: fair.id,
      label: fair.title,
      detail: "Story",
    },
    {
      id: "b-cal",
      kind: "calendar",
      storyId: null,
      label: "Calendar",
      detail: "",
    },
    {
      id: "b-vol",
      kind: "volunteer",
      storyId: null,
      label: "Volunteer",
      detail: "",
    },
    {
      id: "b-sponsors",
      kind: "sponsors",
      storyId: null,
      label: "Sponsors",
      detail: "",
    },
    {
      id: "b-links",
      kind: "links",
      storyId: null,
      label: "Links",
      detail: "",
    },
    {
      id: "b-cta",
      kind: "cta",
      storyId: null,
      label: "CTA",
      detail: "",
    },
    {
      id: "b-socials",
      kind: "socials",
      storyId: null,
      label: "Socials",
      detail: "",
    },
  ];

  return state;
}

describe("exportNewsletterMtk", () => {
  it("emits image placeholders and never emits img tags", () => {
    const { html, text } = exportNewsletterMtk(fixtureState());

    assert.doesNotMatch(html, /<img\b/i);
    assert.match(html, /\[Image: header logo\]/);
    assert.match(html, /\[Image: Stock the Fridge\]/);
    assert.match(html, /\[Image: Book Fair\]/);
    assert.match(html, /\[Image: Fridge restock\]/);
    assert.match(html, /\[Image: Local Market\]/);

    assert.match(text, /\[Image: header logo\]/);
    assert.match(text, /\[Image: Stock the Fridge\]/);
    assert.doesNotMatch(text, /<img\b/i);
  });

  it("preserves key sections, headings, and links without email chrome", () => {
    const { html, text } = exportNewsletterMtk(fixtureState());

    assert.doesNotMatch(html, /<!DOCTYPE/i);
    assert.doesNotMatch(html, /<html\b/i);
    assert.doesNotMatch(html, /<body\b/i);

    assert.match(html, /<h2>From Maria &amp; Jordan<\/h2>/);
    assert.match(html, /Welcome back/);
    assert.match(html, /★ Stock the Fridge/);
    assert.match(html, /More news &amp; events/);
    assert.match(html, /Book Fair/);
    assert.match(html, /Upcoming calendar/);
    assert.match(html, /Volunteer/);
    assert.match(html, /Thank you sponsors/);
    assert.match(html, /Helpful links/);
    assert.match(html, /Get involved/);
    assert.match(html, /Follow us/);
    assert.match(html, /<hr>/);

    assert.match(
      html,
      /href="https:\/\/example\.com\/signup\/fridge"/,
    );
    assert.match(html, /href="https:\/\/example\.com\/bookfair"/);
    assert.match(html, /href="https:\/\/example\.com\/calendar"/);
    assert.match(html, /href="https:\/\/instagram\.com\/lincolnpto"/);

    assert.match(text, /From Maria & Jordan/);
    assert.match(text, /Stock the Fridge/);
    assert.match(text, /https:\/\/example\.com\/signup\/fridge/);
    assert.match(text, /---/);
  });

  it("skips excluded stories and empty optional sections", () => {
    const state = fixtureState();
    const fair = state.stories.find((s) => s.eventId === "evt-fair")!;
    fair.included = false;
    state.calendarChips = [];
    state.volunteerAsks = state.volunteerAsks.map((v) => ({
      ...v,
      included: false,
    }));
    state.sponsors = [];
    state.sponsorCtaLabel = "";
    state.helpfulLinks = [];
    state.footerCtaHeadline = "";
    state.footerCtaLabel = "";

    const { html } = exportNewsletterMtk(state);
    assert.doesNotMatch(html, /Book Fair/);
    assert.doesNotMatch(html, /Upcoming calendar/);
    assert.doesNotMatch(html, /Volunteer/);
    assert.doesNotMatch(html, /Thank you sponsors/);
    assert.doesNotMatch(html, /Helpful links/);
    assert.match(html, /Stock the Fridge/);
  });
});
