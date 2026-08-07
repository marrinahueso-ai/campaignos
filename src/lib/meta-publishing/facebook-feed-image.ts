import "server-only";

import sharp from "sharp";
import { safeFetch } from "@/lib/security/safe-fetch";
import { supabaseStorageHostPatterns } from "@/lib/security/safe-outbound-url";

/** Meta-recommended Facebook feed portrait size (4:5). */
export const FACEBOOK_FEED_WIDTH = 1080;
export const FACEBOOK_FEED_HEIGHT = 1350;

const FACEBOOK_FEED_ASPECT = FACEBOOK_FEED_WIDTH / FACEBOOK_FEED_HEIGHT;
const ASPECT_TOLERANCE = 0.02;

const FEED_CANVAS_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 } as const;

function isFacebookFeedAspect(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }

  return Math.abs(width / height - FACEBOOK_FEED_ASPECT) <= ASPECT_TOLERANCE;
}

/** Pad approved square feed artwork to 4:5 with a neutral white canvas for Facebook. */
export async function prepareFacebookFeedImageBytes(
  imageUrl: string,
): Promise<{ bytes: Buffer; contentType: "image/jpeg" } | { error: string }> {
  const fetched = await safeFetch(
    imageUrl,
    {},
    {
      allowHttp: false,
      allowedHostPatterns: supabaseStorageHostPatterns(),
      timeoutMs: 20_000,
      maxBytes: 20_000_000,
    },
  );

  if (!fetched.ok) {
    const { reportIntegrationError } = await import(
      "@/lib/monitoring/report-error"
    );
    reportIntegrationError("meta", new Error(fetched.error), {
      action: "prepareFacebookFeedImageBytes.fetch",
    });
    return { error: `Unable to download feed artwork: ${fetched.error}` };
  }

  const response = fetched.response;
  if (!response.ok) {
    return { error: `Unable to download feed artwork (HTTP ${response.status}).` };
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());
  const image = sharp(inputBuffer, { sequentialRead: true });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  try {
    const pipeline = isFacebookFeedAspect(width, height)
      ? image.clone().resize(FACEBOOK_FEED_WIDTH, FACEBOOK_FEED_HEIGHT, { fit: "fill" })
      : image.clone().resize(FACEBOOK_FEED_WIDTH, FACEBOOK_FEED_HEIGHT, {
          fit: "contain",
          background: FEED_CANVAS_BACKGROUND,
        });

    const bytes = await pipeline.jpeg({ quality: 90 }).toBuffer();
    return { bytes, contentType: "image/jpeg" };
  } catch (error) {
    const { reportIntegrationError } = await import(
      "@/lib/monitoring/report-error"
    );
    reportIntegrationError("meta", error, {
      action: "prepareFacebookFeedImageBytes.process",
    });
    const message = error instanceof Error ? error.message : "Image processing failed";
    return { error: message };
  }
}
