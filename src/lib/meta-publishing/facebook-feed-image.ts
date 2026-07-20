import "server-only";

import sharp from "sharp";

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
  let response: Response;
  try {
    response = await fetch(imageUrl);
  } catch (error) {
    const { reportIntegrationError } = await import(
      "@/lib/monitoring/report-error"
    );
    reportIntegrationError("meta", error, { action: "prepareFacebookFeedImageBytes.fetch" });
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    return { error: `Unable to download feed artwork: ${message}` };
  }

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
