import "server-only";

import { isAiConfigured } from "@/lib/ai/provider";
import { logAiUsage } from "@/lib/ai/usage";
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

async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    const bytes = Buffer.from(await response.arrayBuffer());
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
): Promise<ResponseContentPart[]> {
  const content = buildUserContent(request);

  if (request.kind === "adjust") {
    const previousImage = await resolveImagePart(request.previousImageUrl);
    if (previousImage) {
      content.push(previousImage);
    }
  }

  for (const inspirationImageUrl of request.inspirationImageUrls) {
    const inspirationImage = await resolveImagePart(inspirationImageUrl);
    if (inspirationImage) {
      content.push(inspirationImage);
    }
  }

  return content;
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
): Promise<ArtworkV2NativeImageResult> {
  const model = resolveArtworkOrchestratorModel();
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

  const content = await buildResponsesInput(request);

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
