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
});
