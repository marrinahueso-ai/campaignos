import QRCode from "qrcode";

import type { FlyerComposerGenerateInput } from "@/lib/flyer-composer/types";

const MIN_SIZE = 64;
const MAX_SIZE = 1024;

export function clampQrSize(size: number): number {
  if (!Number.isFinite(size)) return 256;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size)));
}

/** True when the string is a http(s) URL suitable for a flyer QR target. */
export function isFlyerQrTarget(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/** Prefer explicit QR link; optionally fall back to CTA URL. */
export function resolveFlyerComposerQrUrl(
  input: FlyerComposerGenerateInput,
): string | null {
  const qr = input.fields.qrUrl?.trim();
  if (qr && isFlyerQrTarget(qr)) return qr;
  const cta = input.fields.ctaUrl?.trim();
  if (cta && isFlyerQrTarget(cta)) {
    if (input.template.hasQr || input.fields.qrCaption?.trim()) return cta;
  }
  return null;
}

/**
 * Generate a scannable QR PNG in-process (no third-party image host).
 */
export async function generateFlyerQrPng(
  url: string,
  size: number,
): Promise<Buffer | null> {
  const target = url.trim();
  if (!isFlyerQrTarget(target)) return null;

  try {
    return await QRCode.toBuffer(target, {
      type: "png",
      width: clampQrSize(size),
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch {
    return null;
  }
}
