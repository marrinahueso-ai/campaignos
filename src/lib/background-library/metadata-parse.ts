import {
  BACKGROUND_SEASONS,
  BACKGROUND_SCHOOL_LEVELS,
} from "./constants.ts";
import type {
  BackgroundSchoolLevel,
  BackgroundSeason,
} from "./types.ts";

export type BackgroundAssetVisionMetadata = {
  title: string;
  filenameLabel: string;
  description: string;
  tags: string[];
  colors: string[];
  style: string;
  audience: string;
  objects: string[];
  season: BackgroundSeason;
  schoolLevel: BackgroundSchoolLevel;
  librarySlugs: string[];
};

const ALLOWED_LIBRARY_SLUGS = new Set([
  "back-to-school",
  "fall",
  "winter",
  "sports",
  "generic",
  "graduation",
]);

function cleanList(values: unknown, max = 16): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = String(raw ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 48);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

export function slugifyBackgroundFilename(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "library-background"}.png`;
}

function asSeason(value: unknown): BackgroundSeason {
  const raw = String(value ?? "").trim().toLowerCase();
  return (BACKGROUND_SEASONS as readonly string[]).includes(raw)
    ? (raw as BackgroundSeason)
    : "anytime";
}

function asSchoolLevel(value: unknown): BackgroundSchoolLevel {
  const raw = String(value ?? "").trim().toLowerCase();
  return (BACKGROUND_SCHOOL_LEVELS as readonly string[]).includes(raw)
    ? (raw as BackgroundSchoolLevel)
    : "any";
}

/** Pure parser for vision JSON (unit-tested without server imports). */
export function parseBackgroundAssetVisionMetadata(
  raw: unknown,
): BackgroundAssetVisionMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = String(row.title ?? "")
    .trim()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  if (!title) return null;

  let filenameLabel = String(row.filenameLabel ?? row.filename_label ?? "")
    .trim()
    .toLowerCase();
  if (!filenameLabel.endsWith(".png") && !filenameLabel.endsWith(".jpg")) {
    filenameLabel = slugifyBackgroundFilename(title);
  } else {
    filenameLabel = filenameLabel
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  const librarySlugs = cleanList(row.librarySlugs ?? row.library_slugs, 3)
    .map((slug) => slug.toLowerCase().replace(/\s+/g, "-"))
    .filter((slug) => ALLOWED_LIBRARY_SLUGS.has(slug));

  return {
    title,
    filenameLabel: filenameLabel || slugifyBackgroundFilename(title),
    description: String(row.description ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 280),
    tags: cleanList(row.tags, 16),
    colors: cleanList(row.colors, 8),
    style: String(row.style ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80),
    audience: String(row.audience ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80),
    objects: cleanList(row.objects, 16),
    season: asSeason(row.season),
    schoolLevel: asSchoolLevel(row.schoolLevel ?? row.school_level),
    librarySlugs: librarySlugs.length > 0 ? librarySlugs : ["generic"],
  };
}
