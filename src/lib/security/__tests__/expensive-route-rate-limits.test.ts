import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Security regression guard: expensive/abusable authenticated API routes
 * must call checkRateLimit before doing the costly work. AI credits already
 * cap total spend on the flyer-composer path, and org membership already
 * gates the Giphy proxy, but neither previously throttled request *burst
 * rate* — a compromised session could otherwise hammer OpenAI/Giphy quota.
 */
function readRouteSrc(relativePath: string): string {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return readFileSync(path, "utf8");
}

const ROUTES = [
  "../../../app/api/flyer-composer/generate/route.ts",
  "../../../app/api/giphy/search/route.ts",
  "../../../app/api/giphy/trending/route.ts",
];

describe("expensive authenticated API routes are rate-limited", () => {
  for (const route of ROUTES) {
    it(`${route} imports and calls checkRateLimit before doing work`, () => {
      const src = readRouteSrc(route);
      assert.match(src, /import \{[^}]*checkRateLimit[^}]*\} from "@\/lib\/security\/rate-limit";/);
      assert.match(src, /const rateLimit = await checkRateLimit\(\{/);
      assert.match(src, /if \(!rateLimit\.allowed\) \{/);
      assert.match(src, /status: 429/);
    });
  }
});
