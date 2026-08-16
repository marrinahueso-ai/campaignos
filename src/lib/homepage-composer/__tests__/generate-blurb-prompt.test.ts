import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMEPAGE_BLURB_MAX_SENTENCES,
  buildHomepageBlurbSystemPrompt,
  buildHomepageBlurbUserPrompt,
  clampBlurbToMaxSentences,
  normalizeHomepageBlurbText,
  stripStaleHomepageBlurbOpener,
} from "@/lib/homepage-composer/generate-blurb-prompt";

const baseContext = {
  date: "2026-08-10" as string | null,
  time: "6:00 PM" as string | null,
  startsOn: null as string | null,
  expiresOn: null as string | null,
  alwaysOn: true,
  linkUrl: "https://example.com/volunteer" as string | null,
  organizationName: "Explorer PTO" as string | null,
  brandVoiceSummary: "Warm and clear",
};

describe("homepage composer blurb prompts", () => {
  it("normalizes fences and labels", () => {
    assert.equal(
      normalizeHomepageBlurbText("```text\nBlurb: Join us Friday.\n```"),
      "Join us Friday.",
    );
  });

  it("clamps to two sentences", () => {
    const long =
      "First sentence here. Second sentence here. Third should go away!";
    assert.equal(
      clampBlurbToMaxSentences(long, HOMEPAGE_BLURB_MAX_SENTENCES),
      "First sentence here. Second sentence here.",
    );
  });

  it("includes seed notes when provided", () => {
    const prompt = buildHomepageBlurbUserPrompt({
      ...baseContext,
      title: "Room Parent meeting",
      seedNotes: "Need helpers for snacks",
    });
    assert.match(prompt, /Need helpers for snacks/);
    assert.match(prompt, /Room Parent meeting/);
    assert.match(prompt, /HARD LIMIT: 1 or 2 sentences/);
  });

  it("bans Join us openers and asks for variety", () => {
    const system = buildHomepageBlurbSystemPrompt();
    assert.match(system, /Never start with Join us/);
    const prompt = buildHomepageBlurbUserPrompt({
      ...baseContext,
      title: "Early Release",
      seedNotes: "",
    });
    assert.match(prompt, /Do NOT open with 'Join us'/);
    assert.match(prompt, /Card angle: info/);
    assert.match(prompt, /schedule change|practical/i);
  });

  it("ignores leftover Join us seed boilerplate", () => {
    const prompt = buildHomepageBlurbUserPrompt({
      ...baseContext,
      title: "Early Release",
      seedNotes: "Join us for Early Release — Sep 16.",
    });
    assert.match(prompt, /infer from title and context only/);
    assert.doesNotMatch(prompt, /NOTES \/ SEED\nJoin us for Early Release/);
  });

  it("keeps useful seed facts even if they start with Join us", () => {
    const prompt = buildHomepageBlurbUserPrompt({
      ...baseContext,
      title: "Early Release",
      seedNotes:
        "Join us for Early Release. Please review your school dismissal pick-up plan.",
    });
    assert.match(prompt, /dismissal pick-up plan/);
  });

  it("lists sibling openings so cards do not repeat", () => {
    const prompt = buildHomepageBlurbUserPrompt({
      ...baseContext,
      title: "Spirit Week - Monday",
      seedNotes: "",
      siblingBlurbs: [
        "Join us for Early Release on September 16.",
        "Join us as we kick off Spirit Week.",
      ],
    });
    assert.match(prompt, /do not reuse their openings/);
    assert.match(prompt, /join us for early/);
  });

  it("strips stale invitation openers as a last resort", () => {
    assert.equal(
      stripStaleHomepageBlurbOpener(
        "Join us for Early Release on September 16!",
      ),
      "Early Release on September 16!",
    );
    assert.equal(
      stripStaleHomepageBlurbOpener(
        "Join us as we kick off Spirit Week by wearing EES gear.",
      ),
      "Kick off Spirit Week by wearing EES gear.",
    );
    assert.equal(
      stripStaleHomepageBlurbOpener("Spirit Week starts Monday. Wear EES gear."),
      "Spirit Week starts Monday. Wear EES gear.",
    );
  });
});
