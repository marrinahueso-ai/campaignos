#!/usr/bin/env node
/**
 * Record a Calendar product demo (Month / Week / Best times DnD → Import list
 * Change a Plan → Import Google → Subscribe → Upload → Home).
 *
 * Modes:
 *   --target product   (default) Authenticated /calendar against HEY_RALLI_BASE_URL
 *                      or https://heyralli.com. Requires HEY_RALLI_TEST_* in .env.local.
 *   --target mockup    Record public/calendar-demo-ease-mockup.html (no auth).
 *
 * Usage:
 *   node scripts/capture-calendar-demo.mjs
 *   node scripts/capture-calendar-demo.mjs --target mockup
 *   node scripts/capture-calendar-demo.mjs --base-url https://heyralli.com
 *   node scripts/capture-calendar-demo.mjs --out public/demos/calendar-demo.webm
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, rename, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tmpDir = path.join(root, ".tmp/calendar-demo");
const defaultOut = path.join(root, "public/demos/calendar-demo.webm");

function argValue(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

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

function hasFfmpeg() {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}

async function optimizeVideo(inputPath, outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  if (!hasFfmpeg()) {
    await rename(inputPath, outputPath);
    console.warn("ffmpeg not found — saved raw Playwright WebM.");
    return;
  }
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-y",
        "-i",
        inputPath,
        "-an",
        "-c:v",
        "libvpx-vp9",
        "-crf",
        "34",
        "-b:v",
        "0",
        "-row-mt",
        "1",
        outputPath,
      ],
      { stdio: "inherit" },
    );
    ffmpeg.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
    );
  });
  await rm(inputPath, { force: true });
}

async function pause(page, ms) {
  await page.waitForTimeout(ms);
}

async function login(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 45_000 },
  );
}

function viewTab(page, name) {
  return page
    .locator('nav[aria-label="Calendar views"] button, [role="tablist"] button')
    .filter({ hasText: new RegExp(`^${name}$`, "i") })
    .first();
}

async function dragFirstChip(page, label) {
  const chip = page.locator('[draggable="true"]').first();
  await chip.waitFor({ state: "visible", timeout: 20_000 });
  const box = await chip.boundingBox();
  if (!box) throw new Error(`No bounding box for ${label} chip`);

  // Drop ~2 columns / ~1 day to the right within the same grid band.
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + Math.min(220, box.width * 3 + 80);
  const endY = startY + 24;

  await page.mouse.move(startX, startY);
  await pause(page, 350);
  await page.mouse.down();
  await pause(page, 200);
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(
      startX + (endX - startX) * ease,
      startY + (endY - startY) * ease - Math.sin(Math.PI * t) * 18,
    );
    await pause(page, 28);
  }
  await page.mouse.up();
  await pause(page, 900);
  console.log(`  DnD ok: ${label}`);
}

async function runProductDemo(page, baseUrl) {
  console.log("→ Calendar");
  await page.goto(`${baseUrl}/calendar`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page
    .locator('nav[aria-label="Calendar views"]')
    .waitFor({ timeout: 45_000 });
  await pause(page, 1600);

  console.log("→ Month DnD");
  await viewTab(page, "Month").click();
  await pause(page, 1200);
  await dragFirstChip(page, "Month");

  console.log("→ Week DnD");
  await viewTab(page, "Week").click();
  await pause(page, 1400);
  if ((await page.locator('[draggable="true"]').count()) > 0) {
    await dragFirstChip(page, "Week");
  } else {
    console.warn("  Week: no draggable chip — lingering on view");
    await pause(page, 1600);
  }

  console.log("→ Best times DnD");
  await viewTab(page, "Best times").click();
  await pause(page, 1400);
  if ((await page.locator('[draggable="true"]').count()) > 0) {
    await dragFirstChip(page, "Best times");
  } else {
    console.warn("  Best times: no draggable chip — lingering on heatmap");
    await pause(page, 1800);
  }

  console.log("→ Import list · Change a Plan");
  await viewTab(page, "Import list").click();
  await pause(page, 1400);
  const planSelect = page.locator("main select").first();
  await planSelect.waitFor({ state: "visible", timeout: 20_000 });
  const options = await planSelect.locator("option").evaluateAll((els) =>
    els.map((el) => ({ value: el.value, label: el.textContent.trim() })),
  );
  const current = await planSelect.inputValue();
  const next = options.find((o) => o.value && o.value !== current) ?? options[1];
  if (next?.value) {
    await planSelect.selectOption(next.value);
    console.log(`  Plan → ${next.label}`);
    await pause(page, 1400);
    // Restore original plan so the demo is non-destructive when possible.
    await planSelect.selectOption(current);
    await pause(page, 900);
  } else {
    await planSelect.click();
    await pause(page, 1200);
  }

  console.log("→ Import · Google → Subscribe → Upload");
  await viewTab(page, "Import").click();
  await pause(page, 1200);

  const google = page
    .locator("main button, main a")
    .filter({ hasText: /Google Calendar/i })
    .first();
  const subscribe = page
    .locator("main button, main a")
    .filter({ hasText: /Subscribe link|RSS|ICS/i })
    .first();
  const upload = page
    .locator("main button, main a")
    .filter({ hasText: /Upload file|Upload a file/i })
    .first();

  await google.scrollIntoViewIfNeeded();
  await google.click();
  await pause(page, 1100);
  await subscribe.scrollIntoViewIfNeeded();
  await subscribe.click();
  await pause(page, 1100);
  await upload.scrollIntoViewIfNeeded();
  await upload.click();
  await pause(page, 1400);

  console.log("→ Home");
  const home = page
    .getByRole("link", { name: /^home$/i })
    .or(page.locator('a[href="/dashboard"]').filter({ hasText: /home/i }))
    .first();
  await home.click();
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 30_000 }).catch(() => {});
  await pause(page, 1800);
}

async function startStaticServer() {
  const publicDir = path.join(root, "public");
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "/calendar-demo-ease-mockup.html" : urlPath;
    const filePath = path.join(publicDir, rel.replace(/^\//, ""));
    if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const type =
      ext === ".html"
        ? "text/html"
        : ext === ".css"
          ? "text/css"
          : ext === ".js"
            ? "text/javascript"
            : "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    createReadStream(filePath).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function runMockupDemo(page, baseUrl) {
  await page.goto(`${baseUrl}/calendar-demo-ease-mockup.html?autoplay=1`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  // Full cinematic timeline ~42s
  await page.waitForSelector("[data-demo-ready]", { timeout: 10_000 });
  await pause(page, 44_000);
}

async function main() {
  const env = loadEnvLocal();
  const target = argValue("--target", "product");
  const outPath = path.resolve(
    root,
    argValue("--out", defaultOut) || defaultOut,
  );
  const baseUrl = (
    argValue("--base-url") ||
    env.HEY_RALLI_BASE_URL ||
    "https://heyralli.com"
  ).replace(/\/$/, "");

  await mkdir(tmpDir, { recursive: true });
  await mkdir(path.dirname(outPath), { recursive: true });

  const viewport = { width: 1440, height: 900 };
  let staticServer = null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: tmpDir, size: viewport },
  });
  const page = await context.newPage();

  try {
    if (target === "mockup") {
      staticServer = await startStaticServer();
      console.log(`Recording mockup @ ${staticServer.baseUrl}`);
      await runMockupDemo(page, staticServer.baseUrl);
    } else {
      const email = env.HEY_RALLI_TEST_EMAIL;
      const password = env.HEY_RALLI_TEST_PASSWORD;
      if (!email || !password) {
        throw new Error(
          "Missing HEY_RALLI_TEST_EMAIL / HEY_RALLI_TEST_PASSWORD in .env.local",
        );
      }
      // Prefer prod when local is the configured base but unreachable.
      let effectiveBase = baseUrl;
      if (/localhost|127\.0\.0\.1/.test(baseUrl) && !hasFlag("--base-url")) {
        try {
          const probe = await fetch(`${baseUrl}/login`, {
            signal: AbortSignal.timeout(2000),
          });
          if (!probe.ok && probe.status >= 500) throw new Error("bad");
        } catch {
          effectiveBase = "https://heyralli.com";
          console.warn(
            `Local ${baseUrl} unreachable — falling back to ${effectiveBase}`,
          );
        }
      }
      console.log(`Recording product @ ${effectiveBase}`);
      await login(page, effectiveBase, email, password);
      await pause(page, 800);
      await runProductDemo(page, effectiveBase);
    }
  } finally {
    const video = page.video();
    // Must save after context.close(), but before browser.close().
    await context.close();
    if (staticServer) await staticServer.close();

    try {
      if (!video) throw new Error("No video captured");
      const rawPath = path.join(tmpDir, "calendar-demo-raw.webm");
      await video.saveAs(rawPath);
      await optimizeVideo(rawPath, outPath);
      const info = await stat(outPath);
      console.log(
        `\nSaved ${outPath} (${Math.round(info.size / 1024)} KB)`,
      );
    } finally {
      await browser.close();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
