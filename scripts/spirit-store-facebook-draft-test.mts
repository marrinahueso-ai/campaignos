/**
 * Spirit Store Facebook draft verification (volunteer omission + regeneration variety).
 * Usage: npx tsx scripts/spirit-store-facebook-draft-test.mts
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import Module from "module";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1]!.trim()] = match[2]!.trim().replace(/^["']|["']$/g, "");
  }
}

const originalLoad = Module._load as (
  request: string,
  parent: Module,
  isMain: boolean,
) => unknown;

Module._load = function (request, parent, isMain) {
  if (request === "next/headers") {
    return {
      cookies: async () => ({
        getAll: () => [],
        set: () => undefined,
      }),
    };
  }
  if (request === "next/cache") {
    return { revalidatePath: () => undefined };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const SPIRIT_STORE_EVENT_ID = "4019c47d-c897-4615-9e28-9b7955737e00";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const { data: event } = await supabase
  .from("events")
  .select("id, title, volunteer_needs")
  .eq("id", SPIRIT_STORE_EVENT_ID)
  .maybeSingle();

if (!event) {
  console.error("Spirit Store event not found:", SPIRIT_STORE_EVENT_ID);
  process.exit(1);
}

const { data: item } = await supabase
  .from("communication_items")
  .select("id, channel, event_communication_step_id")
  .eq("event_id", event.id)
  .eq("channel", "facebook")
  .limit(1)
  .maybeSingle();

if (!item) {
  console.error("No Facebook communication item for Spirit Store.");
  process.exit(1);
}

const { data: versions } = await supabase
  .from("communication_versions")
  .select("version_number, content")
  .eq("communication_item_id", item.id)
  .order("version_number", { ascending: false })
  .limit(1);

const priorVersion = versions?.[0]?.version_number ?? 0;
const priorContent = versions?.[0]?.content ?? "";

console.info("Spirit Store pre-draft state:", {
  eventId: event.id,
  title: event.title,
  rawVolunteerNeedsInDb: event.volunteer_needs,
  communicationItemId: item.id,
  priorVersion,
  priorContentPreview: priorContent.slice(0, 200),
});

const { buildGroundingContext } = await import("../src/lib/ai-grounding/index.ts");
const { formatGroundingContextForPrompt } = await import(
  "../src/lib/ai-grounding/formatter.ts"
);
const { hasVerifiedVolunteerNeeds } = await import(
  "../src/lib/events/volunteer-needs.ts"
);

const grounding = await buildGroundingContext({
  eventId: event.id,
  channel: "facebook",
  stepId: item.event_communication_step_id ?? undefined,
});

if (!grounding) {
  console.error("Failed to build grounding context.");
  process.exit(1);
}

const groundingText = formatGroundingContextForPrompt(grounding);
const volunteerInGrounding =
  hasVerifiedVolunteerNeeds(grounding.event.volunteerNeeds) ||
  grounding.allowedTopics.some((topic) => topic.toLowerCase().includes("volunteer")) ||
  !grounding.omittedTopics.some((topic) => topic.toLowerCase().includes("volunteer"));

console.info("Grounding volunteer check:", {
  sanitizedVolunteerNeeds: grounding.event.volunteerNeeds,
  volunteerInAllowedTopics: grounding.allowedTopics.filter((t) =>
    t.toLowerCase().includes("volunteer"),
  ),
  volunteerOmittedTopics: grounding.omittedTopics.filter((t) =>
    t.toLowerCase().includes("volunteer"),
  ),
  volunteerLeakInGroundingText:
    /volunteer needs:/i.test(groundingText) &&
    !/volunteer needs: null/i.test(groundingText),
});

const { draftCommunicationWithAi } = await import("../src/lib/ai/draft.ts");

const result = await draftCommunicationWithAi({
  eventId: event.id,
  communicationItemId: item.id,
  channel: "facebook",
  stepId: item.event_communication_step_id ?? undefined,
});

const draftLower = (result.draftText ?? "").toLowerCase();
const volunteerMention =
  /\bvolunteer(s)?\b/.test(draftLower) ||
  /\b8\b/.test(draftLower) && draftLower.includes("help");
const similarToPrior =
  priorContent.length > 0 &&
  result.draftText &&
  normalizeForCompare(result.draftText) === normalizeForCompare(priorContent);

console.info("Draft result:", {
  success: result.success,
  error: result.error,
  versionNumber: result.versionNumber,
  expectedVersion: priorVersion + 1,
  versionIncremented: result.versionNumber === priorVersion + 1,
  volunteerMention,
  similarToPrior,
  draftText: result.draftText,
});

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const passed =
  result.success &&
  result.versionNumber === priorVersion + 1 &&
  !volunteerMention &&
  !volunteerInGrounding &&
  !similarToPrior;

console.info(passed ? "PASS: Spirit Store Facebook draft test" : "FAIL: Spirit Store Facebook draft test");
process.exit(passed ? 0 : 1);
