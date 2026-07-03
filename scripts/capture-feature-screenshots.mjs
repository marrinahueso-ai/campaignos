#!/usr/bin/env node
/**
 * Capture marketing feature preview PNGs from /features/preview/[slug].
 * Usage: node scripts/capture-feature-screenshots.mjs [--port 3000]
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/images/features");

const SLUGS = [
  "dashboard",
  "planning-hub",
  "workflow",
  "calendar",
  "heatmap",
  "artwork",
  "approvals",
  "publish",
];

const portArgIndex = process.argv.indexOf("--port");
const port = portArgIndex >= 0 ? Number(process.argv[portArgIndex + 1]) : 3000;
const baseUrl = `http://127.0.0.1:${port}`;

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

async function main() {
  await mkdir(outDir, { recursive: true });

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
    const page = await browser.newPage({
      viewport: { width: 1280, height: 960 },
      deviceScaleFactor: 2,
    });

    for (const slug of SLUGS) {
      const url = `${baseUrl}/features/preview/${slug}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-feature-capture]", { timeout: 30_000 });
      await page.waitForTimeout(slug === "planning-hub" ? 900 : 600);

      const target = page.locator("[data-feature-capture]").first();
      await target.screenshot({
        path: path.join(outDir, `${slug}.png`),
        type: "png",
      });
      console.log(`Captured ${slug}.png`);
    }

    await browser.close();
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
