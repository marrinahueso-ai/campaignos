import "server-only";

import { CANVA_API_BASE } from "@/lib/canva/config";
import type {
  CanvaDesignSummary,
  CanvaExportJobResponse,
  CanvaListDesignsResponse,
} from "@/lib/canva/types";

async function canvaFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const response = await fetch(`${CANVA_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Canva API ${path} failed:`, response.status, text);
    return null;
  }

  return (await response.json()) as T;
}

export async function listCanvaDesigns(
  accessToken: string,
  limit = 25,
): Promise<CanvaDesignSummary[]> {
  const payload = await canvaFetch<CanvaListDesignsResponse>(
    accessToken,
    `/designs?ownership=owned&sort=modified_descending&limit=${limit}`,
  );

  if (!payload?.items) {
    return [];
  }

  return payload.items.map((item) => ({
    id: item.id,
    title: item.title?.trim() || "Untitled design",
    thumbnailUrl: item.thumbnail?.url ?? null,
    updatedAt: item.updated_at ?? null,
    editUrl: item.urls?.edit_url ?? null,
  }));
}

export async function createCanvaPngExportJob(
  accessToken: string,
  designId: string,
  dimensions?: { width?: number; height?: number },
): Promise<string | null> {
  const format: Record<string, unknown> = {
    type: "png",
    export_quality: "regular",
  };

  if (dimensions?.width) {
    format.width = dimensions.width;
  }
  if (dimensions?.height) {
    format.height = dimensions.height;
  }

  const payload = await canvaFetch<CanvaExportJobResponse>(accessToken, "/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design_id: designId,
      format,
    }),
  });

  return payload?.job?.id ?? null;
}

export async function waitForCanvaExportJob(
  accessToken: string,
  exportJobId: string,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<{ urls: string[] } | { error: string }> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const delayMs = options?.delayMs ?? 1500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const payload = await canvaFetch<CanvaExportJobResponse>(
      accessToken,
      `/exports/${exportJobId}`,
    );

    const job = payload?.job;
    if (!job) {
      return { error: "Could not check Canva export status." };
    }

    if (job.status === "success") {
      const urls = job.urls ?? [];
      if (urls.length === 0) {
        return { error: "Canva export finished without a download URL." };
      }
      return { urls };
    }

    if (job.status === "failed") {
      return {
        error: job.error?.message ?? "Canva could not export this design.",
      };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { error: "Canva export timed out. Try again in a moment." };
}

export async function downloadCanvaExportUrl(url: string): Promise<Buffer | null> {
  const response = await fetch(url);
  if (!response.ok) {
    console.error("Canva export download failed:", response.status);
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
