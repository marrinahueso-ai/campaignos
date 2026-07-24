import "server-only";

import { CANVA_API_BASE } from "@/lib/canva/config";
import type {
  CanvaDesignSummary,
  CanvaExportJobResponse,
  CanvaListDesignsResponse,
} from "@/lib/canva/types";

type CanvaFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string };

async function canvaFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<CanvaFetchResult<T>> {
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
    let message = `Canva request failed (${response.status}).`;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string; code?: string };
      if (parsed.message?.trim()) message = parsed.message.trim();
      if (parsed.code?.trim()) code = parsed.code.trim();
    } catch {
      if (text.trim()) message = text.trim().slice(0, 240);
    }
    return { ok: false, status: response.status, message, code };
  }

  return { ok: true, data: (await response.json()) as T };
}

function mapDesignList(
  payload: CanvaListDesignsResponse | null | undefined,
): CanvaDesignSummary[] {
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

export async function listCanvaDesigns(
  accessToken: string,
  limit = 25,
): Promise<CanvaDesignSummary[]> {
  // Include owned + shared so school/team designs the user can open in Canva appear.
  const result = await canvaFetch<CanvaListDesignsResponse>(
    accessToken,
    `/designs?ownership=any&sort_by=modified_descending&limit=${limit}`,
  );

  if (!result.ok) {
    return [];
  }

  return mapDesignList(result.data);
}

export async function createCanvaImageExportJob(
  accessToken: string,
  designId: string,
  options?: {
    width?: number;
    height?: number;
    /** Prefer png; jpg is used as a fallback for some design types. */
    type?: "png" | "jpg";
  },
): Promise<{ jobId: string } | { error: string }> {
  const format: Record<string, unknown> = {
    type: options?.type ?? "png",
    export_quality: "regular",
  };

  // Prefer default design size — forcing 1080x1080 can 403 on Free/upscale limits.
  if (options?.width) {
    format.width = options.width;
  }
  if (options?.height) {
    format.height = options.height;
  }

  const result = await canvaFetch<CanvaExportJobResponse>(accessToken, "/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design_id: designId,
      format,
    }),
  });

  if (!result.ok) {
    if (result.status === 403 || result.code === "permission_denied") {
      return {
        error:
          "Canva blocked export for this design under the connected account. Even if you “own” it in the UI, it may live on a school Team. Disconnect → log into that Team in Canva → Connect again. Or try a simple design created under your personal Home (not a Team folder). Docs/whiteboards often can’t export as images.",
      };
    }
    return { error: result.message || "Could not start Canva export." };
  }

  const jobId = result.data.job?.id;
  if (!jobId) {
    return { error: "Could not start Canva export." };
  }

  return { jobId };
}

/** @deprecated Use createCanvaImageExportJob */
export async function createCanvaPngExportJob(
  accessToken: string,
  designId: string,
  dimensions?: { width?: number; height?: number },
): Promise<{ jobId: string } | { error: string }> {
  return createCanvaImageExportJob(accessToken, designId, {
    width: dimensions?.width,
    height: dimensions?.height,
    type: "png",
  });
}

export async function waitForCanvaExportJob(
  accessToken: string,
  exportJobId: string,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<{ urls: string[] } | { error: string }> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const delayMs = options?.delayMs ?? 1500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await canvaFetch<CanvaExportJobResponse>(
      accessToken,
      `/exports/${exportJobId}`,
    );

    if (!result.ok) {
      return { error: result.message || "Could not check Canva export status." };
    }

    const job = result.data.job;
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
