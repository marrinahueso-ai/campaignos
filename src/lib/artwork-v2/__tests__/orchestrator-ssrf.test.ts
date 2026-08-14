import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Security regression guard: `fetchImageAsDataUrl` in the Artwork V2
 * orchestrator fetches user-influenced inspiration/reference/logo URLs
 * (Campaign Builder, Artwork V2 regeneration, Flyer Composer all funnel
 * through this single function). A raw `fetch(imageUrl)` here is
 * server-side SSRF — it must go through the safeFetch + Supabase-storage
 * allowlist, same as the sibling ai-artwork provider's reference-image
 * fetch. This test pins that wiring at the source level so a future edit
 * can't silently regress back to a raw fetch.
 */
function readOrchestratorSrc(): string {
  const path = fileURLToPath(
    new URL("../orchestrator.ts", import.meta.url),
  );
  return readFileSync(path, "utf8");
}

describe("artwork-v2 orchestrator — fetchImageAsDataUrl SSRF guard", () => {
  it("imports safeFetch and the Supabase storage host allowlist", () => {
    const src = readOrchestratorSrc();
    assert.match(src, /@\/lib\/security\/safe-fetch/);
    assert.match(src, /supabaseStorageHostPatterns/);
  });

  it("fetchImageAsDataUrl calls safeFetch with an allowedHostPatterns option", () => {
    const src = readOrchestratorSrc();
    const fnStart = src.indexOf("async function fetchImageAsDataUrl(");
    assert.ok(fnStart >= 0, "fetchImageAsDataUrl not found");
    const fnEnd = src.indexOf("\n}\n", fnStart);
    const fnBody = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);

    assert.match(fnBody, /safeFetch\(/);
    assert.match(fnBody, /allowedHostPatterns:\s*supabaseStorageHostPatterns\(\)/);
    assert.match(fnBody, /allowHttp:\s*false/);
  });

  it("fetchImageAsDataUrl does not call the global fetch directly on the raw URL", () => {
    const src = readOrchestratorSrc();
    const fnStart = src.indexOf("async function fetchImageAsDataUrl(");
    const fnEnd = src.indexOf("\n}\n", fnStart);
    const fnBody = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);

    // Only safeFetch's internal call (inside safe-fetch.ts, not this file)
    // should touch the network; this file must not call `fetch(imageUrl` or
    // `await fetch(` directly.
    assert.doesNotMatch(fnBody, /[^.]\bfetch\(imageUrl\)/);
    assert.doesNotMatch(fnBody, /await fetch\(/);
  });
});
