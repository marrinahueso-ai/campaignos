import { NextResponse } from "next/server";
import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import { generateFlyerComposer } from "@/lib/flyer-composer/generate";
import type {
  FlyerComposerAssetContext,
  FlyerComposerBrandKit,
  FlyerComposerGenerateInput,
  FlyerComposerPrintSize,
  FlyerComposerSlotFields,
  FlyerComposerStartContext,
  FlyerComposerStartPath,
  FlyerComposerTemplateContext,
} from "@/lib/flyer-composer/types";

export const dynamic = "force-dynamic";

const SLOT_KEYS: (keyof FlyerComposerSlotFields)[] = [
  "orgName",
  "headline",
  "schoolYear",
  "location",
  "directions",
  "datesEvents",
  "aiDirection",
  "bodyCopy",
  "donationTiers",
  "ctaLabel",
  "ctaUrl",
  "qrUrl",
  "qrCaption",
  "footerLine",
  "lastYearNotes",
];

const START_PATHS = new Set<FlyerComposerStartPath>(["update", "proven", "new"]);
const PRINT_SIZES = new Set<FlyerComposerPrintSize>(["letter", "half"]);

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseStart(raw: Record<string, unknown>): FlyerComposerStartContext {
  const pathRaw = readString(raw.path).trim();
  const path = START_PATHS.has(pathRaw as FlyerComposerStartPath)
    ? (pathRaw as FlyerComposerStartPath)
    : null;
  const printSizeRaw = readString(raw.printSize).trim();
  const printSize = PRINT_SIZES.has(printSizeRaw as FlyerComposerPrintSize)
    ? (printSizeRaw as FlyerComposerPrintSize)
    : null;

  return {
    path,
    pathLabel: readString(raw.pathLabel).trim() || null,
    printSize,
    printSizeLabel: readString(raw.printSizeLabel).trim() || null,
  };
}

function parseTemplate(raw: Record<string, unknown>): FlyerComposerTemplateContext | null {
  const templateId = readString(raw.templateId).trim();
  const templateName = readString(raw.templateName).trim();
  if (!templateId || !templateName) return null;

  return {
    templateId,
    templateName,
    isCustom: raw.isCustom === true,
    ratio: readString(raw.ratio).trim() || null,
    hasQr: raw.hasQr === true,
  };
}

function parseAssets(raw: Record<string, unknown> | null): FlyerComposerAssetContext {
  const fileTypeRaw = readString(raw?.customTemplateFileType).trim();
  const fileType =
    fileTypeRaw === "pdf" || fileTypeRaw === "image" ? fileTypeRaw : null;
  const photoSourceRaw = readString(raw?.inspirationPhotoSource).trim();
  const photoSource =
    photoSourceRaw === "sample" || photoSourceRaw === "upload"
      ? photoSourceRaw
      : null;
  const inspirationPhotoPresent =
    raw?.inspirationPhotoPresent === true && photoSource !== null;

  return {
    inspirationPhotoPresent,
    inspirationPhotoSource: photoSource,
    inspirationPhotoLabel:
      readString(raw?.inspirationPhotoLabel).trim() || null,
    inspirationPhotoNote: readString(raw?.inspirationPhotoNote).trim() || null,
    inspirationPhotoUrl:
      inspirationPhotoPresent
        ? readString(raw?.inspirationPhotoUrl).trim() || null
        : null,
    customTemplatePresent: raw?.customTemplatePresent === true,
    customTemplateFileName:
      readString(raw?.customTemplateFileName).trim() || null,
    customTemplateFileType: fileType,
    customTemplateNote: readString(raw?.customTemplateNote).trim() || null,
    customTemplateImageUrl:
      readString(raw?.customTemplateImageUrl).trim() || null,
  };
}

function parseBrandKit(raw: Record<string, unknown> | null): FlyerComposerBrandKit | null {
  if (!raw) return null;
  const logoDisplayRaw = readString(raw.logoDisplay).trim();
  const logoDisplay =
    logoDisplayRaw === "pto" ||
    logoDisplayRaw === "school" ||
    logoDisplayRaw === "lettermark" ||
    logoDisplayRaw === "none"
      ? logoDisplayRaw
      : "none";

  return {
    organizationShortName:
      readString(raw.organizationShortName).trim() || null,
    primaryColor: readString(raw.primaryColor).trim() || null,
    accentColor: readString(raw.accentColor).trim() || null,
    fontStyle: readString(raw.fontStyle).trim() || null,
    mascotLabel: readString(raw.mascotLabel).trim() || null,
    ptoLogoUploaded: raw.ptoLogoUploaded === true,
    schoolLogoUploaded: raw.schoolLogoUploaded === true,
    logoDisplay,
  };
}

function parseGenerateBody(body: unknown): FlyerComposerGenerateInput | null {
  const raw = readRecord(body);
  if (!raw) return null;

  const templateRaw = readRecord(raw.template);
  const legacyTemplateId = readString(raw.templateId).trim();
  const legacyTemplateName = readString(raw.templateName).trim();
  const template =
    parseTemplate(
      templateRaw ?? {
        templateId: legacyTemplateId,
        templateName: legacyTemplateName,
        isCustom: raw.isCustom,
        ratio: raw.ratio,
        hasQr: raw.hasQr,
      },
    ) ?? null;
  if (!template) return null;

  const start = parseStart(readRecord(raw.start) ?? {});
  const assets = parseAssets(readRecord(raw.assets));
  const fieldsRaw = readRecord(raw.fields) ?? {};
  const fields: Partial<FlyerComposerSlotFields> = {};
  for (const key of SLOT_KEYS) {
    fields[key] = readString(fieldsRaw[key]);
  }

  return {
    start,
    template,
    assets,
    brandEnabled: readBool(raw.brandEnabled, true),
    brandKit: parseBrandKit(readRecord(raw.brandKit)),
    fields,
  };
}

export async function POST(request: Request) {
  const access = await requireFlyerComposerGenerateAccess();
  if (!access.ok) {
    return NextResponse.json(
      {
        success: false,
        error: access.error,
        imageUrl: null,
        imageBase64: null,
        slots: null,
        aiUsed: false,
      },
      { status: access.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
        imageUrl: null,
        imageBase64: null,
        slots: null,
        aiUsed: false,
      },
      { status: 400 },
    );
  }

  const input = parseGenerateBody(body);
  if (!input) {
    return NextResponse.json(
      {
        success: false,
        error: "template.templateId and template.templateName are required.",
        imageUrl: null,
        imageBase64: null,
        slots: null,
        aiUsed: false,
      },
      { status: 400 },
    );
  }

  const result = await generateFlyerComposer(input, access.organizationId);
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
