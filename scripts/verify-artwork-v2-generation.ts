import {
  ARTWORK_V2_MAX_INSPIRATION_IMAGES,
  DEFAULT_ARTWORK_IMAGE_QUALITY,
  DEFAULT_ARTWORK_REASONING_EFFORT,
  resolveArtworkImageQuality,
  resolveArtworkOrchestratorModel,
  resolveArtworkReasoningEffort,
} from "../src/lib/artwork-v2/constants";
import {
  ARTWORK_GENERATION_PROFILES,
  resolveArtworkGenerationProfile,
} from "../src/lib/artwork-v2/generation-mode";
import { resolveArtworkV2ImageSizePreset } from "../src/lib/artwork-v2/image-size";
import { resolveOpenAiImageSize } from "../src/lib/ai-artwork/constants";
import {
  auditArtworkV2OrchestrationPayload,
  logArtworkGenerationPayloadAudit,
} from "../src/lib/ai-artwork/prompt-audit";
import { resolveFinalArtworkImagePrompt } from "../src/lib/ai-artwork/generation-mode";
import { buildArtworkDownloadFilename } from "../src/lib/artwork-v2/download";
import { buildDefaultArtworkPrompt } from "../src/lib/artwork-v2/event-prompt";

const userPrompt =
  "create a fun run flyer for PTO. event date is 7/31/2026 at 3pm. families are welcome to join. use inspiration photo as a guide.";

const adjustmentComments = "make the background brighter and add more space for the date";

const trimmedUserPrompt = resolveFinalArtworkImagePrompt(userPrompt);
const flyerSize = resolveOpenAiImageSize(
  resolveArtworkV2ImageSizePreset({ id: "flyer", assetType: "flyer" }),
);

const createAudit = auditArtworkV2OrchestrationPayload({
  userManualPrompt: trimmedUserPrompt,
  orchestration: {
    kind: "create",
    userPrompt: trimmedUserPrompt,
    inspirationImageUrls: [
      "https://example.com/inspiration-a.png",
      "https://example.com/inspiration-b.png",
    ],
  },
  size: flyerSize,
});

const adjustAudit = auditArtworkV2OrchestrationPayload({
  userManualPrompt: trimmedUserPrompt,
  orchestration: {
    kind: "adjust",
    userPrompt: trimmedUserPrompt,
    adjustmentComments,
    previousImageUrl: "https://example.com/previous.png",
    inspirationImageUrls: ["https://example.com/inspiration.png"],
  },
  size: flyerSize,
});

logArtworkGenerationPayloadAudit(createAudit);

const checks = [
  {
    name: "refined mode generates 2 versions",
    ok: ARTWORK_GENERATION_PROFILES.refined.versionCount === 2,
  },
  {
    name: "quick mode generates 1 version",
    ok: ARTWORK_GENERATION_PROFILES.quick.versionCount === 1,
  },
  {
    name: "refined profile is the default when mode is omitted",
    ok: resolveArtworkGenerationProfile(null).versionCount === 2,
  },
  {
    name: "user prompt is trimmed only — no CampaignOS rewrite",
    ok: trimmedUserPrompt === userPrompt,
  },
  {
    name: "create orchestration audit valid with multiple inspiration images",
    ok: createAudit.valid && createAudit.inspirationImageCount === 2,
  },
  {
    name: "max inspiration limit is 4",
    ok: ARTWORK_V2_MAX_INSPIRATION_IMAGES === 4,
  },
  {
    name: "adjust orchestration includes previous image",
    ok: adjustAudit.valid && adjustAudit.previousImageIncluded,
  },
  {
    name: "orchestrator model defaults to gpt-5.5",
    ok: resolveArtworkOrchestratorModel() === "gpt-5.5",
  },
  {
    name: "native image quality defaults to high",
    ok:
      resolveArtworkImageQuality() === DEFAULT_ARTWORK_IMAGE_QUALITY &&
      DEFAULT_ARTWORK_IMAGE_QUALITY === "high",
  },
  {
    name: "reasoning effort defaults to medium",
    ok:
      resolveArtworkReasoningEffort() === DEFAULT_ARTWORK_REASONING_EFFORT &&
      DEFAULT_ARTWORK_REASONING_EFFORT === "medium",
  },
  {
    name: "no event title injected into orchestration input",
    ok: !trimmedUserPrompt.includes("Fun Run") && !trimmedUserPrompt.includes("Bus Driver"),
  },
  {
    name: "no school name injected into orchestration input",
    ok: !trimmedUserPrompt.toLowerCase().includes("elementary"),
  },
  {
    name: "no legacy inspiration guidance in user prompt",
    ok:
      !trimmedUserPrompt.includes("Do NOT recreate") &&
      !trimmedUserPrompt.includes("Use attached inspiration"),
  },
  {
    name: "size is technical only (not in user prompt text)",
    ok: !trimmedUserPrompt.includes(flyerSize),
  },
  {
    name: "adjust orchestration keeps user prompt separate from comments",
    ok:
      adjustAudit.orchestrationKind === "adjust" &&
      trimmedUserPrompt.length > 0 &&
      adjustmentComments.length > 0,
  },
  {
    name: "artwork prompt includes event title and date",
    ok: (() => {
      const prompt = buildDefaultArtworkPrompt({
        event: {
          id: "e1",
          title: "Fall Festival",
          description: "Carnival games and food trucks.",
          date: "2026-10-15",
          time: "15:00",
          location: "Playground",
          audience: "All families",
          theme: "Autumn carnival",
          status: "draft",
          category: null,
          eventType: "full_event",
          communicationStrategy: "full_campaign",
          calendarImportId: null,
          eventOwner: null,
          approvalOrganizationRoleId: null,
          budget: null,
          volunteerNeeds: null,
          createdAt: "2026-01-01",
          updatedAt: null,
        },
        organizationName: "Oak Elementary PTO",
        item: {
          id: "feed",
          label: "Day Before",
          assetType: "instagram_graphic",
          planLabel: "Day Before Feed",
          formatLabel: "Feed 1:1",
          metaPlacement: "feed",
          relativeDay: -1,
          channel: "instagram",
          channelLabel: "Instagram",
          communicationStepId: null,
        },
        hasInspiration: false,
      });

      return (
        prompt.includes("Fall Festival") &&
        prompt.includes("Oct") &&
        prompt.includes("Playground") &&
        prompt.includes("Oak Elementary PTO") &&
        prompt.includes("All families")
      );
    })(),
  },
  {
    name: "approved download filename is slugged",
    ok: buildArtworkDownloadFilename("Instagram Feed") === "instagram-feed-approved.png",
  },
];

console.log("Artwork v2 orchestration audit\n");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}

const failures = checks.filter((check) => !check.ok).length;
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);
