/**
 * Flatten logo canvas pixels to transparent PNG.
 * Targets cream/white site tones (~#FAF5F1 / #FFFCF7) and near-black
 * export backgrounds (ChatGPT/brand lockups on black).
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** Site card + common logo canvas creams. */
const REFERENCE_BG = [
  [255, 252, 247], // --cos-card
  [250, 245, 241], // hey-ralli-logo corners
  [251, 246, 242],
  [253, 248, 244],
  [255, 255, 255],
  [254, 254, 254],
];

function colorDistance(r, g, b, [rr, gg, bb]) {
  return Math.sqrt((r - rr) ** 2 + (g - gg) ** 2 + (b - bb) ** 2);
}

function minReferenceDistance(r, g, b) {
  return Math.min(...REFERENCE_BG.map((ref) => colorDistance(r, g, b, ref)));
}

function backgroundAlpha(r, g, b, a) {
  if (a === 0) return 0;

  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const avg = (r + g + b) / 3;
  const spread = max - min;
  const refDist = minReferenceDistance(r, g, b);

  // Near-black export canvas (logo lockups on black).
  if (max <= 28) return 0;
  if (avg <= 40 && max <= 55) return 0;
  if (avg <= 55 && spread <= 8 && max <= 70) return 0;

  // Hard-remove obvious cream/white canvas pixels.
  if (refDist <= 10) return 0;
  if (min >= 245 && spread <= 8) return 0;
  if (min >= 228 && spread <= 14 && refDist <= 18) return 0;

  // Feather anti-aliased cream edges into transparency.
  if (min >= 210 && spread <= 18 && refDist <= 28) {
    const t = (refDist - 10) / 18;
    return Math.round(a * Math.max(0, Math.min(1, t)));
  }

  return a;
}

async function processLogo(relativePath) {
  const inputPath = path.join(ROOT, relativePath);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    data[i + 3] = backgroundAlpha(r, g, b, a);
  }

  const output = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(inputPath, output);
  console.log(`Processed ${relativePath} (${info.width}x${info.height})`);
}

await Promise.all([
  processLogo("public/hey-ralli-logo.png"),
  processLogo("public/hey-ralli-logo-circle.png"),
]);
