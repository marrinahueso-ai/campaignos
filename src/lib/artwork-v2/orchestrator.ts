import "server-only";

import { isAiConfigured } from "@/lib/ai/provider";
import { logAiUsage } from "@/lib/ai/usage";
import type { ArtworkUsageMetadata } from "@/lib/ai/types";
import {
  resolveArtworkImageQuality,
  resolveArtworkOrchestratorModel,
  resolveArtworkReasoningEffort,
  type ArtworkImageQuality,
  type ArtworkReasoningEffort,
} from "@/lib/artwork-v2/constants";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type ResponseContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail?: "auto" | "low" | "high" };

type ImageGenerationCallOutput = {
  type?: string;
  status?: string;
  result?: string;
  revised_prompt?: string;
};

type OpenAiResponsesPayload = {
  id?: string;
  status?: string;
  model?: string;
  output?: ImageGenerationCallOutput[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

export type ArtworkV2OrchestrationRequest =
  | {
      kind: "create";
      userPrompt: string;
      inspirationImageUrls: string[];
    }
  | {
      kind: "adjust";
      userPrompt: string;
      adjustmentComments: string;
      previousImageUrl: string;
      inspirationImageUrls: string[];
    };

/** Optional member/milestone attribution forwarded to ai_usage_log. Safe to omit. */
export type ArtworkV2UsageAttribution = {
  userId?: string | null;
  organizationId?: string | null;
  isRegeneration?: boolean;
  milestoneLabel?: string | null;
  relativeDay?: number | null;
};

export type ArtworkV2NativeImageResult = {
  success: boolean;
  imageBase64: string | null;
  revisedPrompt: string | null;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  error: string | null;
};

function parseResponsesError(status: number, body: string, model: string): string {
  try {
    const parsed = JSON.parse(body) as OpenAiResponsesPayload;
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // fall through
  }

  return `OpenAI Responses API error (HTTP ${status}, model: ${model}).`;
}

function stripDataUriPrefix(value: string): string {
  const match = value.match(/^data:image\/[\w+.-]+;base64,(.+)$/i);
  return match ? match[1] : value;
}

function extractImageGenerationResults(payload: OpenAiResponsesPayload): Array<{
  imageBase64: string;
  revisedPrompt: string | null;
}> {
  const results: Array<{ imageBase64: string; revisedPrompt: string | null }> = [];

  for (const item of payload.output ?? []) {
    if (item.type !== "image_generation_call" || item.status === "failed") {
      continue;
    }

    const raw = item.result?.trim();
    if (!raw) {
      continue;
    }

    results.push({
      imageBase64: stripDataUriPrefix(raw),
      revisedPrompt:
        typeof item.revised_prompt === "string" && item.revised_prompt.trim()
          ? item.revised_prompt.trim()
          : null,
    });
  }

  return results;
}

/**
 * Inspiration/reference URLs here originate from client input (Campaign
 * Builder inspiration images, Flyer Composer reference/logo URLs), so this
 * must not be a raw `fetch` — that would be server-side SSRF (cloud metadata,
 * internal services). Route through the same safeFetch + Supabase-storage
 * allowlist used by the sibling ai-artwork provider's reference-image fetch.
 */
async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const { safeFetch } = await import("@/lib/security/safe-fetch");
    const { supabaseStorageHostPatterns } = await import(
      "@/lib/security/safe-outbound-url"
    );
    const fetched = await safeFetch(
      imageUrl,
      {},
      {
        allowHttp: false,
        allowedHostPatterns: supabaseStorageHostPatterns(),
        timeoutMs: 20_000,
        maxBytes: 12_000_000,
      },
    );
    if (!fetched.ok || !fetched.response.ok) {
      return null;
    }

    const contentType =
      fetched.response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/png";
    const bytes = Buffer.from(await fetched.response.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

async function resolveImagePart(imageUrl: string | null): Promise<ResponseContentPart | null> {
  if (!imageUrl?.trim()) {
    return null;
  }

  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("data:")) {
    return { type: "input_image", image_url: trimmed, detail: "high" };
  }

  const dataUrl = await fetchImageAsDataUrl(trimmed);
  if (!dataUrl) {
    return null;
  }

  return { type: "input_image", image_url: dataUrl, detail: "high" };
}

function buildUserContent(request: ArtworkV2OrchestrationRequest): ResponseContentPart[] {
  const content: ResponseContentPart[] = [{ type: "input_text", text: request.userPrompt }];

  if (request.kind === "adjust") {
    content.push({ type: "input_text", text: request.adjustmentComments });
  }

  return content;
}

async function buildResponsesInput(
  request: ArtworkV2OrchestrationRequest,
): Promise<{ content: ResponseContentPart[]; error: string | null }> {
  const content = buildUserContent(request);

  if (request.kind === "adjust") {
    const previousImage = await resolveImagePart(request.previousImageUrl);
    if (!previousImage) {
      return {
        content,
        error: "Could not load the previous artwork to edit. Try again.",
      };
    }
    content.push(previousImage);
  }

  let missingInspiration = 0;
  for (const inspirationImageUrl of request.inspirationImageUrls) {
    const inspirationImage = await resolveImagePart(inspirationImageUrl);
    if (inspirationImage) {
      content.push(inspirationImage);
    } else {
      missingInspiration += 1;
    }
  }

  if (missingInspiration > 0) {
    const total = request.inspirationImageUrls.length;
    return {
      content,
      error:
        total === missingInspiration
          ? "None of the inspiration images could be sent to the AI. Re-upload them and try again."
          : `${missingInspiration} of ${total} inspiration images could not be sent to the AI. Re-upload them and try again.`,
    };
  }

  return { content, error: null };
}

function resolveImageGenerationAction(
  request: ArtworkV2OrchestrationRequest,
): "auto" | "generate" | "edit" {
  if (request.kind === "adjust") {
    return "edit";
  }

  return "generate";
}

/**
 * ChatGPT-style image creation: GPT-5.5 Responses API with the native image_generation tool.
 * Hey Ralli passes only user-supplied text and images — no creative prompt engineering.
 */
export async function generateArtworkV2ImageNative(
  request: ArtworkV2OrchestrationRequest,
  size: string,
  eventId: string | null,
  options?: {
    quality?: ArtworkImageQuality;
    reasoningEffort?: ArtworkReasoningEffort;
  },
  attribution?: ArtworkV2UsageAttribution,
): Promise<ArtworkV2NativeImageResult> {
  const model = resolveArtworkOrchestratorModel();
  const usageMetadata: ArtworkUsageMetadata = {
    isRegeneration: attribution?.isRegeneration ?? request.kind === "adjust",
    milestoneLabel: attribution?.milestoneLabel ?? null,
    relativeDay: attribution?.relativeDay ?? null,
  };
  const usageUserId = attribution?.userId ?? null;
  const quality = options?.quality ?? resolveArtworkImageQuality();
  const reasoningEffort = options?.reasoningEffort ?? resolveArtworkReasoningEffort();
  const emptyUsage = {
    promptTokens: null as number | null,
    completionTokens: null as number | null,
    totalTokens: null as number | null,
  };

  if (!isAiConfigured()) {
    return {
      success: false,
      imageBase64: null,
      revisedPrompt: null,
      model,
      ...emptyUsage,
      error: "OpenAI API key is not configured.",
    };
  }

  const { assertAiCreditsAvailable } = await import("@/lib/ai/credits");
  const credits = await assertAiCreditsAvailable({
    organizationId: attribution?.organizationId,
    eventId,
    actionType: "generate_artwork",
  });
  if (!credits.ok) {
    return {
      success: false,
      imageBase64: null,
      revisedPrompt: null,
      model,
      ...emptyUsage,
      error: credits.error,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      imageBase64: null,
      revisedPrompt: null,
      model,
      ...emptyUsage,
      error: "OpenAI API key is not configured.",
    };
  }

  const assembled = await buildResponsesInput(request);
  if (assembled.error) {
    return {
      success: false,
      imageBase64: null,
      revisedPrompt: null,
      model,
      ...emptyUsage,
      error: assembled.error,
    };
  }
  const content = assembled.content;

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content }],
      reasoning: { effort: reasoningEffort },
      tools: [
        {
          type: "image_generation",
          action: resolveImageGenerationAction(request),
          quality,
          size,
        },
      ],
    }),
  });

  const body = await response.text();
  let payload: OpenAiResponsesPayload;

  try {
    payload = JSON.parse(body) as OpenAiResponsesPayload;
  } catch {
    payload = {};
  }

  const usage = payload.usage;
  const resolvedModel = payload.model ?? model;
  const tokenUsage = {
    promptTokens: usage?.input_tokens ?? null,
    completionTokens: usage?.output_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
  };

  if (!response.ok) {
    const error = parseResponsesError(response.status, body, model);
    await logAiUsage({
      eventId,
      actionType: "generate_artwork",
      channel: null,
      model: resolvedModel,
      ...tokenUsage,
      success: false,
      errorMessage: error,
      userId: usageUserId,
      metadata: usageMetadata,
    });

    return {
      success: false,
      imageBase64: null,
      revisedPrompt: null,
      model: resolvedModel,
      ...tokenUsage,
      error,
    };
  }

  const images = extractImageGenerationResults(payload);
  if (images.length === 0) {
    const error = "OpenAI did not return an image.";
    await logAiUsage({
      eventId,
      actionType: "generate_artwork",
      channel: null,
      model: resolvedModel,
      ...tokenUsage,
      success: false,
      errorMessage: error,
      userId: usageUserId,
      metadata: usageMetadata,
    });

    return {
      success: false,
      imageBase64: null,
      revisedPrompt: null,
      model: resolvedModel,
      ...tokenUsage,
      error,
    };
  }

  const image = images[0];

  await logAiUsage({
    eventId,
    actionType: "generate_artwork",
    channel: null,
    model: resolvedModel,
    ...tokenUsage,
    success: true,
    userId: usageUserId,
    metadata: usageMetadata,
  });

  return {
    success: true,
    imageBase64: image.imageBase64,
    revisedPrompt: image.revisedPrompt,
    model: resolvedModel,
    ...tokenUsage,
    error: null,
  };
}
