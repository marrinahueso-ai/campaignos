#!/usr/bin/env node
/**
 * Capture Meta App Review screenshot pack for docs/ops/meta-app-review-assets/.
 *
 * Usage:
 *   node scripts/capture-meta-app-review.mjs
 *   node scripts/capture-meta-app-review.mjs --base-url https://heyralli.com
 *
 * Requires HEY_RALLI_TEST_EMAIL / HEY_RALLI_TEST_PASSWORD in .env.local.
 * Passwords are never logged.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs/ops/meta-app-review-assets");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    let k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v.trim();
  }
  return env;
}

function argValue(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function pause(page, ms) {
  await page.waitForTimeout(ms);
}

async function screenshot(page, filename, opts = {}) {
  const filePath = path.join(outDir, filename);
  await page.screenshot({ path: filePath, type: "png", fullPage: false, ...opts });
  console.log(`  ✓ ${filename}`);
  return filePath;
}

async function skip(filename, reason) {
  const txtPath = path.join(outDir, filename.replace(/\.png$/, ".SKIPPED.txt"));
  const content = `${filename}\n\nSkipped: ${reason}\nCaptured: ${new Date().toISOString()}\n`;
  await writeFile(txtPath, content, "utf8");
  console.log(`  ⊘ ${filename} — ${reason}`);
  return { skipped: true, reason, path: txtPath };
}

async function login(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await screenshot(page, "00-login-page.png");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 45_000,
  });
  await pause(page, 1200);
}

async function waitForMain(page) {
  await page.locator("main").first().waitFor({ state: "visible", timeout: 45_000 });
}

async function captureDashboard(page, baseUrl) {
  const url = page.url();
  if (!/\/(dashboard|events|calendar|approvals|communications)/.test(url)) {
    await page.goto(`${baseUrl}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  }
  await waitForMain(page);
  await pause(page, 800);
  return screenshot(page, "01-login.png");
}

async function captureSettingsIntegrations(page, baseUrl) {
  await page.goto(`${baseUrl}/settings/integrations`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);
  await pause(page, 800);
  return screenshot(page, "02-settings-integrations.png");
}

async function tryMetaConsent(page, baseUrl) {
  await page.goto(`${baseUrl}/settings/meta`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);
  await pause(page, 600);

  const connect = page
    .getByRole("link", { name: /connect with facebook/i })
    .or(page.getByRole("button", { name: /connect with facebook/i }))
    .first();

  const alreadyConnected = await page
    .getByText(/linked instagram|connected page|page connected/i)
    .first()
    .isVisible()
    .catch(() => false);

  if (alreadyConnected) {
    return {
      captured: false,
      reason:
        "Meta already connected — consent screen not shown. Reconnect flow requires founder with Meta tester session.",
      ...(await skip(
        "03-meta-consent.png",
        "Meta already connected; consent screen only appears on fresh Connect OAuth.",
      )),
    };
  }

  if (!(await connect.isVisible().catch(() => false))) {
    return {
      captured: false,
      reason: "Connect with Facebook button not visible (may lack manage_integrations).",
      ...(await skip("03-meta-consent.png", "Connect button not found on /settings/meta")),
    };
  }

  const popupPromise = page
    .context()
    .waitForEvent("page", { timeout: 15_000 })
    .catch(() => null);

  await connect.click();
  const popup = await popupPromise;
  const target = popup ?? page;

  try {
    await target.waitForLoadState("domcontentloaded", { timeout: 20_000 });
    await pause(target, 2500);

    const url = target.url();
    const bodyText = ((await target.locator("body").innerText().catch(() => "")) || "")
      .slice(0, 2000)
      .toLowerCase();

    const isFacebook =
      /facebook\.com|fb\.com|meta\.com/.test(url) ||
      /log in to facebook|continue with facebook|access request|permissions/.test(bodyText);

    if (!isFacebook) {
      if (popup) await popup.close().catch(() => {});
      return {
        captured: false,
        reason: `OAuth did not reach Facebook (landed on ${url}).`,
        ...(await skip(
          "03-meta-consent.png",
          `OAuth redirect did not reach Facebook login/consent (url: ${url}).`,
        )),
      };
    }

    if (/log in to facebook|email or phone|password/.test(bodyText)) {
      if (popup) await popup.close().catch(() => {});
      return {
        captured: false,
        reason:
          "Facebook login wall — automated capture cannot authenticate as Meta tester. Founder must capture consent while signed into Meta test account.",
        ...(await skip(
          "03-meta-consent.png",
          "Blocked by Facebook login wall — founder must capture consent screen with Meta tester account.",
        )),
      };
    }

    await screenshot(target, "03-meta-consent.png");
    if (popup) await popup.close().catch(() => {});
    return { captured: true, path: path.join(outDir, "03-meta-consent.png") };
  } catch (err) {
    if (popup) await popup.close().catch(() => {});
    return {
      captured: false,
      reason: String(err?.message || err),
      ...(await skip("03-meta-consent.png", String(err?.message || err))),
    };
  }
}

async function captureMetaConnected(page, baseUrl) {
  await page.goto(`${baseUrl}/settings/meta`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);
  await pause(page, 800);
  return screenshot(page, "04-meta-connected.png");
}

async function captureApprovals(page, baseUrl) {
  await page.goto(`${baseUrl}/approvals`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);
  await page
    .getByRole("heading", {
      name: /approvals\s*&\s*scheduling|approvals\s+and\s+scheduling|^approvals$/i,
    })
    .first()
    .waitFor({ state: "visible", timeout: 45_000 })
    .catch(() => {});
  await pause(page, 800);
  return screenshot(page, "05-approvals-publish.png");
}

async function captureCommunicationsHub(page, baseUrl) {
  await page.goto(`${baseUrl}/communications`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);
  await pause(page, 1000);
  return screenshot(page, "07-communications-hub.png");
}

async function captureInboxReply(page, baseUrl) {
  await page.goto(`${baseUrl}/communications`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);
  await pause(page, 800);

  const thread = page
    .locator("main a[href*='/communications/'], main button")
    .filter({ hasText: /messenger|instagram|comment|message|dm/i })
    .first();

  const listItem = page
    .locator("main [role='listitem'] a, main [data-thread-id], main a[href*='thread']")
    .first();

  const candidate = (await thread.isVisible().catch(() => false)) ? thread : listItem;

  if (!(await candidate.isVisible().catch(() => false))) {
    return {
      captured: false,
      ...(await skip(
        "08-inbox-reply.png",
        "No inbox threads visible — Connect Meta and seed tester DMs for founder capture.",
      )),
    };
  }

  await candidate.click();
  await pause(page, 1200);

  const composer = page
    .locator("main textarea, main [contenteditable='true'], main input[type='text']")
    .last();
  if (await composer.isVisible().catch(() => false)) {
    await composer.scrollIntoViewIfNeeded().catch(() => {});
  }

  return { captured: true, path: await screenshot(page, "08-inbox-reply.png") };
}

async function captureCommentEngagement(page, baseUrl) {
  await page.goto(`${baseUrl}/communications`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);

  const commentsFilter = page
    .getByRole("button", { name: /comments?/i })
    .or(page.getByRole("tab", { name: /comments?/i }))
    .first();

  if (await commentsFilter.isVisible().catch(() => false)) {
    await commentsFilter.click();
    await pause(page, 800);
  }

  const commentThread = page
    .locator("main a, main button")
    .filter({ hasText: /comment|facebook|instagram|page post/i })
    .first();

  if (await commentThread.isVisible().catch(() => false)) {
    await commentThread.click();
    await pause(page, 1000);
    return { captured: true, path: await screenshot(page, "09-comment-engagement.png") };
  }

  return {
    captured: false,
    ...(await skip(
      "09-comment-engagement.png",
      "No comment threads visible — seed Page/IG comments on test assets for founder capture.",
    )),
  };
}

async function captureInsightsOrg(page, baseUrl) {
  await page.goto(`${baseUrl}/insights`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMain(page);
  await page
    .getByRole("heading", { name: /^insights$/i })
    .first()
    .waitFor({ state: "visible", timeout: 45_000 })
    .catch(() => {});
  await pause(page, 1000);
  return screenshot(page, "10-insights-org.png");
}

async function captureEventInsights(page, baseUrl, eventId) {
  if (eventId) {
    await page.goto(`${baseUrl}/events/${eventId}?tab=insights`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  } else {
    await page.goto(`${baseUrl}/events`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForMain(page);
    const eventLink = page.locator("main a[href*='/events/']").first();
    if (!(await eventLink.isVisible().catch(() => false))) {
      return {
        captured: false,
        ...(await skip(
          "11-insights-event.png",
          "No events listed — set HEY_RALLI_TEST_EVENT_ID or create a test event.",
        )),
      };
    }
    const href = await eventLink.getAttribute("href");
    const id = href?.match(/\/events\/([^/?#]+)/)?.[1];
    if (!id) {
      return {
        captured: false,
        ...(await skip("11-insights-event.png", "Could not resolve event id from events list.")),
      };
    }
    await page.goto(`${baseUrl}/events/${id}?tab=insights`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  }

  await waitForMain(page);
  await pause(page, 1200);
  return { captured: true, path: await screenshot(page, "11-insights-event.png") };
}

async function writeManifest(results) {
  await writeFile(
    path.join(outDir, "capture-manifest.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2),
    "utf8",
  );
}

async function main() {
  const env = loadEnvLocal();
  const email = env.HEY_RALLI_TEST_EMAIL;
  const password = env.HEY_RALLI_TEST_PASSWORD;
  const eventId = env.HEY_RALLI_TEST_EVENT_ID?.trim() || null;

  if (!email || !password) {
    throw new Error(
      "Missing HEY_RALLI_TEST_EMAIL / HEY_RALLI_TEST_PASSWORD in .env.local",
    );
  }

  const baseUrl = (argValue("--base-url") || env.HEY_RALLI_BASE_URL || "https://heyralli.com").replace(
    /\/$/,
    "",
  );

  await mkdir(outDir, { recursive: true });

  console.log(`Meta App Review screenshots → ${outDir}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Test user: ${email}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const results = {};

  try {
    console.log("\n1. Login");
    await login(page, baseUrl, email, password);
    results["00-login-page.png"] = { captured: true };
    results["01-login.png"] = { captured: true };
    await captureDashboard(page, baseUrl);

    console.log("\n2. Settings → Integrations");
    results["02-settings-integrations.png"] = { captured: true };
    await captureSettingsIntegrations(page, baseUrl);

    console.log("\n3. Meta OAuth consent (attempt)");
    results["03-meta-consent.png"] = await tryMetaConsent(page, baseUrl);

    console.log("\n4. Meta connected state");
    results["04-meta-connected.png"] = { captured: true };
    await captureMetaConnected(page, baseUrl);

    console.log("\n5. Approvals");
    results["05-approvals-publish.png"] = { captured: true };
    await captureApprovals(page, baseUrl);

    console.log("\n6. Facebook Page live post (skip — Meta-owned)");
    results["06-page-post-live.png"] = await skip(
      "06-page-post-live.png",
      "Requires Facebook Page in browser as Meta tester — founder must capture published post on test Page.",
    );

    console.log("\n7. Communications Hub");
    results["07-communications-hub.png"] = { captured: true };
    await captureCommunicationsHub(page, baseUrl);

    console.log("\n8. Inbox reply thread");
    results["08-inbox-reply.png"] = await captureInboxReply(page, baseUrl);

    console.log("\n9. Comment engagement");
    results["09-comment-engagement.png"] = await captureCommentEngagement(page, baseUrl);

    console.log("\n10. Org Insights");
    results["10-insights-org.png"] = { captured: true };
    await captureInsightsOrg(page, baseUrl);

    console.log("\n11. Event Insights");
    results["11-insights-event.png"] = await captureEventInsights(page, baseUrl, eventId);

    console.log("\n12. Webhook config (skip — Meta Developer portal)");
    results["12-webhook-config.png"] = await skip(
      "12-webhook-config.png",
      "Meta Developer App → Webhooks dashboard — founder must screenshot /api/meta/webhook subscription in developers.facebook.com.",
    );
  } finally {
    await browser.close();
  }

  await writeManifest(results);

  const captured = Object.entries(results).filter(([, v]) => v.captured !== false && !v.skipped);
  const skipped = Object.entries(results).filter(([, v]) => v.skipped || v.captured === false);

  console.log(`\nDone: ${captured.length} captured, ${skipped.length} skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
