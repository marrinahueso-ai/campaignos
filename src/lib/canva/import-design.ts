import "server-only";

import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import {
  createCanvaPngExportJob,
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

export async function exportCanvaDesignAsPng(
  accessToken: string,
  designId: string,
  item: ArtworkWorkflowItem,
): Promise<{ bytes: Buffer; filename: string } | { error: string }> {
  const exportJobId = await createCanvaPngExportJob(
    accessToken,
    designId,
    exportDimensionsForItem(item),
  );

  if (!exportJobId) {
    return { error: "Could not start Canva export." };
  }

  const exportResult = await waitForCanvaExportJob(accessToken, exportJobId);
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

  const safeTitle = item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    bytes,
    filename: `${safeTitle || "canva-artwork"}.png`,
  };
}
