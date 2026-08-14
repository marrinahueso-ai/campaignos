import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

const inspirationStep = readFileSync(
  join(root, "components/campaign-builder-v2/InspirationStep.tsx"),
  "utf8",
);
const provider = readFileSync(
  join(root, "components/campaign-builder-v2/CampaignBuilderProvider.tsx"),
  "utf8",
);
const actions = readFileSync(
  join(root, "lib/campaign-builder-v2/actions.ts"),
  "utf8",
);
const page = readFileSync(
  join(root, "app/(dashboard)/events/[id]/campaign-builder/page.tsx"),
  "utf8",
);

describe("Create with AI upload_artwork gate wiring", () => {
  it("page passes EffectiveAccess upload_artwork into the builder", () => {
    assert.match(page, /hasPermission\("upload_artwork"\)/);
    assert.match(page, /canUploadArtwork/);
  });

  it("InspirationStep hides upload UI when canUploadArtwork is false", () => {
    assert.match(
      inspirationStep,
      /Inspiration and logo uploads are disabled for your role/,
    );
    assert.match(inspirationStep, /\{canUploadArtwork && \(/);
    assert.match(inspirationStep, /aria-label="Upload inspiration images"/);
  });

  it("provider blocks client uploads and surfaces a permission error", () => {
    assert.match(provider, /if \(!canUploadArtwork\)/);
    assert.match(
      provider,
      /You do not have permission to upload artwork/,
    );
  });

  it("uploadInspirationImageAction rejects without upload_artwork", () => {
    assert.match(
      actions,
      /export async function uploadInspirationImageAction/,
    );
    assert.match(
      actions,
      /if \(!\(await hasPermission\("upload_artwork"\)\)\)/,
    );
    assert.match(
      actions,
      /You do not have permission to upload artwork/,
    );
  });

  it("upload and generate actions require event access before persist/upload", () => {
    assert.match(actions, /requireEventAccess\(eventId\)/);
    assert.match(actions, /requireEventAccess\(input\.eventId\)/);
    const inspirationStorage = readFileSync(
      join(root, "lib/campaign-builder-v2/inspiration-storage.ts"),
      "utf8",
    );
    assert.match(inspirationStorage, /requireEventAccess\(eventId\)/);
    const storage = readFileSync(join(root, "lib/ai-artwork/storage.ts"), "utf8");
    assert.match(storage, /requireEventAccess\(input\.eventId\)/);
    assert.match(storage, /eventId\?: string/);
  });

  function extractFunctionBody(signature: string): string {
    const start = actions.indexOf(signature);
    assert.ok(start >= 0, `${signature} not found`);
    const next = actions.indexOf("\nexport async function", start + signature.length);
    return actions.slice(start, next >= 0 ? next : undefined);
  }

  it("regenerateArtworkAction requires event access and upload_artwork", () => {
    const body = extractFunctionBody("export async function regenerateArtworkAction(");
    assert.match(body, /requireEventAccess\(input\.eventId\)/);
    assert.match(body, /hasPermission\("upload_artwork"\)/);
  });

  it("regenerateMilestoneArtworkAction requires event access and upload_artwork", () => {
    const body = extractFunctionBody(
      "export async function regenerateMilestoneArtworkAction(",
    );
    assert.match(body, /requireEventAccess\(input\.eventId\)/);
    assert.match(body, /hasPermission\("upload_artwork"\)/);
  });

  it("regenerateCaptionAction requires event access and upload_artwork", () => {
    const body = extractFunctionBody("export async function regenerateCaptionAction(");
    assert.match(body, /requireEventAccess\(input\.eventId\)/);
    assert.match(body, /hasPermission\("upload_artwork"\)/);
  });
});
