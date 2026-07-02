import "server-only";

import { isAiConfigured } from "@/lib/ai/provider";
import type {
  ArtworkGenerateRequest,
  ArtworkGenerateResult,
  ArtworkProviderAdapter,
  ArtworkProviderId,
  InspirationStrength,
} from "@/lib/ai-artwork/types";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGES_EDITS_URL = "https://api.openai.com/v1/images/edits";

type OpenAiImageModelFamily = "gpt-image" | "dall-e";

type OpenAiErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    param?: string;
    code?: string;
  };
};

type OpenAiImageItem = {
  b64_json?: string;
  base64?: string;
  url?: string;
  revised_prompt?: string;
};

type OpenAiImagesResponse = {
  data?: OpenAiImageItem[];
};

const DEFAULT_IMAGE_MODEL = "gpt-image-1";

function resolveImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

export function getConfiguredImageModel(): string {
  return resolveImageModel();
}

function logArtworkProviderStartup(): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("AI Artwork Provider: OpenAI");
  console.info(`Model: ${resolveImageModel()}`);
}

logArtworkProviderStartup();

function resolveModelFamily(model: string): OpenAiImageModelFamily {
  return model.toLowerCase().startsWith("gpt-image") ? "gpt-image" : "dall-e";
}

export function modelSupportsImageReference(model: string = resolveImageModel()): boolean {
  return resolveModelFamily(model) === "gpt-image";
}

function resolveInputFidelity(strength?: InspirationStrength): string {
  switch (strength) {
    case "light":
      return "low";
    case "medium":
      return "medium";
    case "strong":
    default:
      return "high";
  }
}

/** GPT image models only accept 1024x1024, 1024x1536, 1536x1024, or auto. */
function normalizeSizeForModel(size: string, model: string): string {
  if (resolveModelFamily(model) === "dall-e") {
    return size;
  }

  const gptSizes = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
  if (gptSizes.has(size)) {
    return size;
  }

  if (size === "1792x1024" || size.endsWith("x1024")) {
    return "1536x1024";
  }

  if (size === "1024x1792" || size.startsWith("1024x")) {
    return "1024x1536";
  }

  return "1024x1024";
}

function parseOpenAiErrorBody(body: string): OpenAiErrorPayload["error"] | null {
  try {
    const parsed = JSON.parse(body) as OpenAiErrorPayload;
    return parsed.error ?? null;
  } catch {
    return body.trim() ? { message: body.slice(0, 500) } : null;
  }
}

function formatOpenAiImageError(status: number, body: string, model: string): string {
  const error = parseOpenAiErrorBody(body);
  if (error?.message) {
    const parts = [error.message];
    if (error.param) parts.push(`Parameter: ${error.param}`);
    if (error.code) parts.push(`Code: ${error.code}`);
    return parts.join(" — ");
  }

  return `OpenAI Images API error (HTTP ${status}, model: ${model}).`;
}

function buildImageGenerationPayload(
  model: string,
  prompt: string,
  size: string,
): Record<string, unknown> {
  const normalizedSize = normalizeSizeForModel(size, model);
  const payload: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size: normalizedSize,
  };

  if (resolveModelFamily(model) === "gpt-image") {
    // GPT image models return b64_json by default and reject response_format.
    payload.quality = "medium";
    payload.output_format = "png";
    return payload;
  }

  if (resolveModelFamily(model) === "dall-e" && model.toLowerCase().includes("-3")) {
    payload.quality = "standard";
  }

  payload.response_format = "b64_json";
  return payload;
}

function stripDataUriPrefix(value: string): string {
  const match = value.match(/^data:image\/[\w+.-]+;base64,(.+)$/i);
  return match ? match[1] : value;
}

function extractBase64FromImageItem(item: OpenAiImageItem): string | null {
  const raw = item.b64_json ?? item.base64;
  if (typeof raw === "string" && raw.length > 0) {
    return stripDataUriPrefix(raw);
  }
  return null;
}

async function fetchImageUrlAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

async function normalizeImageResponse(
  data: OpenAiImageItem[] | undefined,
): Promise<{ imageBase64: string | null; revisedPrompt: string | null }> {
  const item = data?.[0];
  if (!item) {
    return { imageBase64: null, revisedPrompt: null };
  }

  let imageBase64 = extractBase64FromImageItem(item);

  if (!imageBase64 && typeof item.url === "string" && item.url.length > 0) {
    imageBase64 = await fetchImageUrlAsBase64(item.url);
  }

  return {
    imageBase64,
    revisedPrompt: typeof item.revised_prompt === "string" ? item.revised_prompt : null,
  };
}

function failureResult(model: string, error: string): ArtworkGenerateResult {
  return {
    success: false,
    imageBase64: null,
    revisedPrompt: null,
    model,
    provider: "openai",
    error,
  };
}

async function fetchReferenceImageBytes(
  url: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return { bytes: buffer, mimeType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

async function generateOpenAiImageWithReference(
  input: ArtworkGenerateRequest,
  model: string,
  apiKey: string,
): Promise<ArtworkGenerateResult> {
  const referenceUrl = input.referenceImageUrl?.trim();
  if (!referenceUrl) {
    return failureResult(model, "Reference image URL is required.");
  }

  const imageData = await fetchReferenceImageBytes(referenceUrl);
  if (!imageData) {
    return failureResult(model, "Could not load inspiration image from storage.");
  }

  try {
    const normalizedSize = normalizeSizeForModel(input.size, model);
    const formData = new FormData();
    formData.append("model", model);
    formData.append("prompt", input.prompt);
    formData.append("n", "1");
    formData.append("size", normalizedSize);
    formData.append("quality", "medium");
    formData.append("output_format", "png");
    formData.append("input_fidelity", resolveInputFidelity(input.inspirationStrength));

    const blob = new Blob([new Uint8Array(imageData.bytes)], {
      type: imageData.mimeType,
    });
    formData.append("image[]", blob, "inspiration-reference.png");

    const response = await fetch(OPENAI_IMAGES_EDITS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const body = await response.text();

    if (!response.ok) {
      return failureResult(model, formatOpenAiImageError(response.status, body, model));
    }

    let parsed: OpenAiImagesResponse;
    try {
      parsed = JSON.parse(body) as OpenAiImagesResponse;
    } catch {
      return failureResult(model, "OpenAI returned an invalid JSON response.");
    }

    const { imageBase64, revisedPrompt } = await normalizeImageResponse(parsed.data);

    if (!imageBase64) {
      return failureResult(model, "No image data returned from OpenAI edits.");
    }

    return {
      success: true,
      imageBase64,
      revisedPrompt,
      model,
      provider: "openai",
      error: null,
    };
  } catch (error) {
    return failureResult(
      model,
      error instanceof Error ? error.message : "Image reference generation failed.",
    );
  }
}

async function generateOpenAiImage(
  input: ArtworkGenerateRequest,
): Promise<ArtworkGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = input.model ?? resolveImageModel();

  if (!apiKey) {
    return failureResult(model, "OpenAI API key is not configured.");
  }

  try {
    if (
      input.referenceImageUrl &&
      modelSupportsImageReference(model)
    ) {
      const referenceResult = await generateOpenAiImageWithReference(input, model, apiKey);
      if (referenceResult.success) {
        return referenceResult;
      }

      if (process.env.NODE_ENV === "development") {
        console.warn(
          "OpenAI image reference edit failed; falling back to text-only generation:",
          referenceResult.error,
        );
      }
    }

    const payload = buildImageGenerationPayload(model, input.prompt, input.size);

    const response = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await response.text();

    if (!response.ok) {
      return failureResult(model, formatOpenAiImageError(response.status, body, model));
    }

    let parsed: OpenAiImagesResponse;
    try {
      parsed = JSON.parse(body) as OpenAiImagesResponse;
    } catch {
      return failureResult(model, "OpenAI returned an invalid JSON response.");
    }

    const { imageBase64, revisedPrompt } = await normalizeImageResponse(parsed.data);

    if (!imageBase64) {
      const hasUrl = Boolean(parsed.data?.[0]?.url);
      const hasB64Field = Boolean(parsed.data?.[0]?.b64_json ?? parsed.data?.[0]?.base64);
      const detail =
        hasUrl && !hasB64Field
          ? "Image URL was returned but could not be downloaded."
          : "No image data returned from OpenAI.";
      return failureResult(model, detail);
    }

    return {
      success: true,
      imageBase64,
      revisedPrompt,
      model,
      provider: "openai",
      error: null,
    };
  } catch (error) {
    return failureResult(
      model,
      error instanceof Error ? error.message : "Image generation failed.",
    );
  }
}

const openAiAdapter: ArtworkProviderAdapter = {
  id: "openai",
  label: "OpenAI Images",
  isConfigured: isAiConfigured,
  supportsImageReference: false,
  inspirationUsageMode: "style_guidance_only",
  generate: generateOpenAiImage,
};

const plannedAdapter = (id: ArtworkProviderId, label: string): ArtworkProviderAdapter => ({
  id,
  label,
  isConfigured: () => false,
  supportsImageReference: false,
  inspirationUsageMode: "style_guidance_only",
  generate: async () => ({
    success: false,
    imageBase64: null,
    revisedPrompt: null,
    model: id,
    provider: id,
    error: `${label} integration is not available yet.`,
  }),
});

const adapters: Record<ArtworkProviderId, ArtworkProviderAdapter> = {
  openai: openAiAdapter,
  canva: plannedAdapter("canva", "Canva"),
  adobe_express: plannedAdapter("adobe_express", "Adobe Express"),
  ideogram: plannedAdapter("ideogram", "Ideogram"),
  midjourney: plannedAdapter("midjourney", "Midjourney"),
};

export function getArtworkProvider(id: ArtworkProviderId = "openai"): ArtworkProviderAdapter {
  return adapters[id];
}

export function getArtworkProviderCapabilities(
  providerId: ArtworkProviderId = "openai",
): Pick<ArtworkProviderAdapter, "supportsImageReference" | "inspirationUsageMode"> {
  if (providerId !== "openai") {
    const provider = getArtworkProvider(providerId);
    return {
      supportsImageReference: provider.supportsImageReference,
      inspirationUsageMode: provider.inspirationUsageMode,
    };
  }

  const supportsReference = modelSupportsImageReference();
  return {
    supportsImageReference: supportsReference,
    inspirationUsageMode: supportsReference ? "image_reference" : "style_guidance_only",
  };
}

export function isArtworkGenerationConfigured(): boolean {
  return getArtworkProvider("openai").isConfigured();
}

export function getArtworkGenerationStatus(): { available: boolean; reason: string | null } {
  if (isArtworkGenerationConfigured()) {
    return { available: true, reason: null };
  }
  return {
    available: false,
    reason: "Add OPENAI_API_KEY to enable AI artwork generation.",
  };
}

export async function generateArtworkImage(
  input: ArtworkGenerateRequest,
  providerId: ArtworkProviderId = "openai",
): Promise<ArtworkGenerateResult> {
  return getArtworkProvider(providerId).generate(input);
}
