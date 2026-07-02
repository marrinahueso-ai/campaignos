import { buildVerifiedEventFacts } from "../src/lib/ai-artwork/event-facts";
import { buildArtworkGenerationPrompt } from "../src/lib/ai-artwork/prompts";
import { buildArtworkTextPlan } from "../src/lib/ai-artwork/text-plan";
import { DEFAULT_GENERATION_SETTINGS } from "../src/lib/ai-artwork/constants";
import type { CreativeBrief } from "../src/lib/creative-director/types";
import type { Event } from "../src/types";

const busDriverEvent: Event = {
  id: "test-event",
  title: "Bus Driver Breakfast",
  description:
    "A warm breakfast to thank our bus drivers for their dedication all year long.",
  date: "2026-03-15",
  time: "07:30",
  location: "School cafeteria",
  audience: "Bus drivers and school staff",
  theme: "Appreciation",
  status: "scheduled",
  category: "community",
  eventType: "appreciation_event",
  communicationStrategy: "full_campaign",
  eventOwner: null,
  budget: null,
  volunteerNeeds: null,
  createdAt: new Date().toISOString(),
  updatedAt: null,
};

const brief: CreativeBrief = {
  campaignTitle: "Bus Driver Breakfast",
  personality: ["Warm", "Grateful"],
  emotionalTone: ["Joyful", "Welcoming"],
  visualDirection: "Warm breakfast appreciation illustration with soft morning light",
  typographySuggestions: "Friendly rounded headers",
  illustrationVsPhotography: "illustrated",
  colorPalette: ["Navy", "Gold", "Warm cream"],
  iconRecommendations: ["Coffee cup", "Sunrise"],
  graphicStyle: "Hand illustrated, warm breakfast appreciation theme",
  textureBackgroundSuggestions: "Soft paper texture",
  consistencyRules: ["Keep illustration style consistent"],
  doNotUse: ["Dark backgrounds", "Corporate stock photos"],
  moodSummary: "Warm · Grateful · Community",
};

const facts = buildVerifiedEventFacts({
  event: busDriverEvent,
  organizationName: "Sample Elementary PTO",
  cta: "Join us in celebrating our bus drivers",
});

const textPlan = buildArtworkTextPlan({
  facts,
  brief,
  assetLabel: "Flyer",
});

const prompt = buildArtworkGenerationPrompt({
  brief,
  smartPrompt: "Warm illustrated breakfast appreciation scene with soft morning light.",
  settings: { ...DEFAULT_GENERATION_SETTINGS },
  assetLabel: "Flyer",
  eventFacts: facts,
  textPlan,
  conceptIndex: 1,
});

const checks = [
  { name: "includes event title", ok: prompt.includes("Bus Driver Breakfast") },
  {
    name: "includes verified date",
    ok: prompt.includes("Mar") && prompt.includes("15") && prompt.includes("2026"),
  },
  { name: "includes verified location", ok: prompt.includes("School cafeteria") },
  {
    name: "includes no-invent instruction",
    ok: prompt.includes("Do not invent dates, times, locations, or copy"),
  },
  {
    name: "requires blank text areas",
    ok: prompt.includes("blank") && prompt.toLowerCase().includes("editable text"),
  },
  {
    name: "no invented placeholder copy instructions",
    ok: !prompt.includes("details about the event"),
  },
  { name: "text plan headline separate", ok: prompt.includes("Headline: Bus Driver Breakfast") },
  {
    name: "breakfast/appreciation theme",
    ok:
      prompt.toLowerCase().includes("breakfast") ||
      prompt.toLowerCase().includes("appreciation"),
  },
];

console.log("Artwork prompt pipeline test\n");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}

const failures = checks.filter((check) => !check.ok).length;
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);
