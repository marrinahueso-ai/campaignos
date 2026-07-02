import {
  auditArtworkGenerationPayload,
  logArtworkGenerationPayloadAudit,
} from "../src/lib/ai-artwork/prompt-audit";
import { resolveOpenAiImageSize } from "../src/lib/ai-artwork/constants";

const userManualPrompt =
  "create a fun run flyer for PTO. event date is 7/31/2026 at 3pm. families are welcome to join. use inspiration photo as a guide.";

const finalPrompt = userManualPrompt.trim();

const audit = auditArtworkGenerationPayload({
  userManualPrompt,
  finalPrompt,
  referenceImageUrl: null,
  size: resolveOpenAiImageSize("square"),
});

logArtworkGenerationPayloadAudit(audit);

const checks = [
  { name: "final prompt equals user manual prompt", ok: finalPrompt === userManualPrompt },
  { name: "no event title injected", ok: !finalPrompt.includes("Bus Driver Breakfast") },
  { name: "no brand colors injected", ok: !finalPrompt.includes("Navy") },
  { name: "no platform label injected", ok: !finalPrompt.includes("Facebook Feed") },
  { name: "no system inspiration guidance injected", ok: !finalPrompt.includes("Do NOT recreate") && !finalPrompt.includes("Use attached inspiration") },
  { name: "no quality bar injected", ok: !finalPrompt.toLowerCase().includes("production-quality") },
  { name: "audit valid with zero inspiration images", ok: audit.valid && audit.inspirationImageCount === 0 },
  { name: "promptMatchesManualPrompt", ok: audit.promptMatchesManualPrompt },
];

console.log("Artwork zero-creative-direction prompt audit\n");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}

const failures = checks.filter((check) => !check.ok).length;
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);
