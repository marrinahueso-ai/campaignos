#!/usr/bin/env node
/**
 * Record marketing feature preview videos from /features/preview/record/[scenario].
 * Usage: node scripts/capture-feature-videos.mjs [--port 3000]
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/videos/features");
const tmpDir = path.join(root, ".tmp/feature-videos");

/** Maps carousel video slug → record scenario route. */
const RECORDINGS = [
  {
    slug: "planning-hub",
    scenario: "campaigns-flow",
    viewport: { width: 1280, height: 960 },
    run: async (page) => {
      await page.waitForSelector('[data-record-step="campaigns"]', { timeout: 30_000 });
      await page.waitForTimeout(1800);
      const openHub = page.locator('[data-record-target="open-planning-hub"]');
      await openHub.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await openHub.click({ timeout: 10_000 });
      await page.waitForSelector('[data-record-step="planning-hub"]', { timeout: 10_000 });
      await page.waitForTimeout(9000);
    },
  },
  {
    slug: "calendar",
    scenario: "calendar-month",
    viewport: { width: 1280, height: 960 },
    run: async (page) => {
      await page.waitForSelector('[data-record-step="calendar-month"]', {
        timeout: 30_000,
      });
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollBy(0, 120));
      await page.waitForTimeout(9000);
    },
  },
  {
    slug: "heatmap",
    scenario: "calendar-heatmap",
    viewport: { width: 1280, height: 960 },
    run: async (page) => {
      await page.waitForSelector('[data-record-step="calendar-heatmap"]', {
        timeout: 30_000,
      });
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: "Best times to post" }).click();
      await page.waitForTimeout(600);
      await page
        .locator('[data-testid="calendar-drop-week-2026-07-02-17"]')
        .first()
        .scrollIntoViewIfNeeded();
      await page.waitForTimeout(9500);
    },
  },
];

const onlyArgIndex = process.argv.indexOf("--only");
const onlySlug = onlyArgIndex >= 0 ? process.argv[onlyArgIndex + 1] : null;

const portArgIndex = process.argv.indexOf("--port");
const port = portArgIndex >= 0 ? Number(process.argv[portArgIndex + 1]) : 3010;
const baseUrl = `http://127.0.0.1:${port}`;

const selectedRecordings = onlySlug
  ? RECORDINGS.filter((recording) => recording.slug === onlySlug)
  : RECORDINGS;

if (onlySlug && selectedRecordings.length === 0) {
  console.error(`Unknown --only slug "${onlySlug}". Expected: ${RECORDINGS.map((r) => r.slug).join(", ")}`);
  process.exit(1);
}

function waitForServer(url, timeoutMs = 120_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url);
        if (response.ok || response.status < 500) {
          resolve(undefined);
          return;
        }
      } catch {
        // retry
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Server did not become ready at ${url}`));
        return;
      }

      setTimeout(tick, 500);
    };

    tick();
  });
}

function hasFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return result.status === 0;
}

async function optimizeVideo(inputPath, outputPath) {
  if (!hasFfmpeg()) {
    const { rename } = await import("node:fs/promises");
    await rename(inputPath, outputPath);
    console.warn("ffmpeg not found — saved raw Playwright WebM without re-encoding.");
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

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });

  await rm(inputPath, { force: true });
}

async function recordScenario(browser, { slug, scenario, viewport, run }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tmpDir,
      size: viewport,
    },
  });

  const page = await context.newPage();

  try {
    const url = `${baseUrl}/features/preview/record/${scenario}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-feature-capture]", { timeout: 60_000 });
    await page.waitForTimeout(800);
    await run(page);
  } finally {
    const video = page.video();
    await context.close();

    if (!video) {
      throw new Error(`No video captured for ${slug}`);
    }

    const rawPath = path.join(tmpDir, `${slug}-raw.webm`);
    await video.saveAs(rawPath);

    const outputPath = path.join(outDir, `${slug}.webm`);
    await optimizeVideo(rawPath, outputPath);
    console.log(`Recorded ${slug}.webm`);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  const server = spawn("npm", ["run", "dev", "--", "-p", String(port)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  let serverLog = "";
  server.stdout?.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    serverLog += chunk.toString();
  });

  try {
    await waitForServer(baseUrl);

    const browser = await chromium.launch();

    for (const recording of selectedRecordings) {
      await recordScenario(browser, recording);
    }

    await browser.close();
    await rm(tmpDir, { recursive: true, force: true });
  } catch (error) {
    console.error(serverLog.slice(-4000));
    throw error;
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
