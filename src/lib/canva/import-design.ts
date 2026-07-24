import "server-only";

import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import {
  createCanvaImageExportJob,
  downloadCanvaExportUrl,
  waitForCanvaExportJob,
} from "@/lib/canva/api-client";

function exportDimensionsForItem(item: ArtworkWorkflowItem): {
  width?: number;
  height?: number;
} {
  if (item.metaPlacement === "story") {
    return { width: 1080, height: 1920 };
  }
  if (item.metaPlacement === "feed") {
    return { width: 1080, height: 1080 };
  }
  return { width: 1080, height: 1080 };
}

export async function exportCanvaDesignAsPngBytes(
  accessToken: string,
  designId: string,
  options?: {
    width?: number;
    height?: number;
    filenameBase?: string;
    /** When true, omit width/height so Canva exports at the design’s native size. */
    useDesignDefaultSize?: boolean;
  },
): Promise<{ bytes: Buffer; filename: string } | { error: string }> {
  const dimensions = options?.useDesignDefaultSize
    ? undefined
    : {
        width: options?.width,
        height: options?.height,
      };

  const dimensionOpts = dimensions
    ? { width: dimensions.width, height: dimensions.height }
    : {};

  let started = await createCanvaImageExportJob(accessToken, designId, {
    ...dimensionOpts,
    type: "png",
  });

  // Some designs export as JPG when PNG is refused.
  if ("error" in started) {
    started = await createCanvaImageExportJob(accessToken, designId, {
      ...dimensionOpts,
      type: "jpg",
    });
  }

  if ("error" in started) {
    return { error: started.error };
  }

  const exportResult = await waitForCanvaExportJob(accessToken, started.jobId);
  if ("error" in exportResult) {
    return exportResult;
  }

  const downloadUrl = exportResult.urls[0];
  if (!downloadUrl) {
    return { error: "Canva export did not return a file." };
  }

  const bytes = await downloadCanvaExportUrl(downloadUrl);
  if (!bytes) {
    return { error: "Could not download exported artwork from Canva." };
  }

  const safeTitle = (options?.filenameBase ?? "canva-artwork")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const ext = downloadUrl.toLowerCase().includes(".jpg") ? "jpg" : "png";
  return {
    bytes,
    filename: `${safeTitle || "canva-artwork"}.${ext}`,
  };
}

export async function exportCanvaDesignAsPng(
  accessToken: string,
  designId: string,
  item: ArtworkWorkflowItem,
): Promise<{ bytes: Buffer; filename: string } | { error: string }> {
  return exportCanvaDesignAsPngBytes(accessToken, designId, {
    ...exportDimensionsForItem(item),
    filenameBase: item.label,
  });
}
