import type {
  AiAssistantStatus,
  AiGenerateTextInput,
  AiGenerateTextResult,
} from "@/lib/ai/types";
import {
  resolveDraftFallbackModel,
  resolveFastDraftModel,
} from "@/lib/ai/models";
import { logAiUsage } from "@/lib/ai/usage";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenAiErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    param?: string;
    code?: string;
  };
};

function usesMaxCompletionTokens(model: string): boolean {
  return (
    model.startsWith("gpt-5") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("o4")
  );
}

function parseOpenAiErrorBody(body: string): OpenAiErrorPayload["error"] | null {
  try {
    const parsed = JSON.parse(body) as OpenAiErrorPayload;
    return parsed.error ?? null;
  } catch {
    return { message: body.slice(0, 500) };
  }
}

function formatOpenAiErrorForLog(
  status: number,
  body: string,
  model: string,
): string {
  const error = parseOpenAiErrorBody(body);
  const parts = [
    `status=${status}`,
    `model=${model}`,
    error?.code ? `code=${error.code}` : null,
    error?.param ? `param=${error.param}` : null,
    error?.type ? `type=${error.type}` : null,
    error?.message ? `message=${error.message}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

function shouldFallbackToDefaultModel(
  status: number,
  body: string,
  model: string,
  fallbackModel: string,
): boolean {
  if (model === fallbackModel) {
    return false;
  }

  const error = parseOpenAiErrorBody(body);
  const message = error?.message?.toLowerCase() ?? "";

  if (status === 404) {
    return true;
  }

  if (error?.code === "model_not_found") {
    return true;
  }

  return (
    message.includes("does not exist") ||
    message.includes("is not supported") ||
    message.includes("invalid model")
  );
}

function buildUserMessage(input: AiGenerateTextInput): Record<string, unknown> {
  const imageUrl = input.imageUrl?.trim();
  if (imageUrl) {
    return {
      role: "user",
      content: [
        { type: "text", text: input.userPrompt },
        {
          type: "image_url",
          image_url: { url: imageUrl, detail: "high" },
        },
      ],
    };
  }

  return { role: "user", content: input.userPrompt };
}

function buildChatCompletionPayload(
  model: string,
  input: AiGenerateTextInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: input.systemPrompt },
      buildUserMessage(input),
    ],
  };

  const tokenLimit = input.maxTokens ?? 1024;

  if (usesMaxCompletionTokens(model)) {
    payload.max_completion_tokens = tokenLimit;
  } else {
    payload.max_tokens = tokenLimit;
    payload.temperature = input.temperature ?? 0.7;
  }

  if (input.jsonMode && !usesMaxCompletionTokens(model)) {
    payload.response_format = { type: "json_object" };
  }

  return payload;
}

export function isAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

export function getAiAssistantStatus(): AiAssistantStatus {
  if (isAiConfigured()) {
    return { available: true, reason: null };
  }

  return {
    available: false,
    reason: "AI not configured — set OPENAI_API_KEY to enable Ralli AI.",
  };
}

async function requestChatCompletion(
  apiKey: string,
  model: string,
  input: AiGenerateTextInput,
): Promise<
  | { ok: true; text: string; usage: OpenAiUsage }
  | { ok: false; status: number; body: string; model: string }
> {
  console.info("✓ OpenAI request sent", {
    model,
    tokenParam: usesMaxCompletionTokens(model)
      ? "max_completion_tokens"
      : "max_tokens",
    keyLoaded: true,
  });

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildChatCompletionPayload(model, input)),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("OpenAI API error:", formatOpenAiErrorForLog(response.status, body, model));
    return { ok: false, status: response.status, body, model };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: OpenAiUsage;
  };

  const text = data.choices?.[0]?.message?.content?.trim() ?? null;

  if (!text) {
    console.error("OpenAI API returned empty content", {
      model,
      choiceCount: data.choices?.length ?? 0,
    });
    return {
      ok: false,
      status: 502,
      body: JSON.stringify({
        error: { message: "No draft text was returned.", code: "empty_response" },
      }),
      model,
    };
  }

  console.info("✓ Response received", {
    model,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
  });

  return {
    ok: true,
    text,
    usage: data.usage ?? {},
  };
}

function failureResult(
  model: string,
  error: string,
  errorCode: AiGenerateTextResult["errorCode"],
  configuredModel: string,
  usedFallbackModel: boolean,
  usage?: OpenAiUsage,
): AiGenerateTextResult {
  return {
    success: false,
    text: null,
    model,
    promptTokens: usage?.prompt_tokens ?? null,
    completionTokens: usage?.completion_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    error,
    errorCode,
    configuredModel,
    usedFallbackModel,
  };
}

async function persistGenerateTextUsage(
  input: AiGenerateTextInput,
  result: AiGenerateTextResult,
  startedAt: number,
): Promise<void> {
  const usage = input.usage;
  if (!usage) return;

  try {
    await logAiUsage({
      eventId: usage.eventId ?? null,
      organizationId: usage.organizationId ?? null,
      userId: usage.userId ?? null,
      actionType: usage.actionType,
      feature: usage.feature ?? null,
      channel: usage.channel ?? null,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      success: result.success,
      errorMessage: result.error,
      errorCode: result.errorCode,
      latencyMs: Math.max(0, Date.now() - startedAt),
    });
  } catch (error) {
    console.error("[ai-usage] generateText persist failed:", error);
  }
}

export async function generateText(
  input: AiGenerateTextInput,
): Promise<AiGenerateTextResult> {
  const startedAt = Date.now();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const configuredModel = input.model?.trim() || resolveFastDraftModel();
  const fallbackModel = resolveDraftFallbackModel(configuredModel);

  const finish = async (result: AiGenerateTextResult) => {
    await persistGenerateTextUsage(input, result, startedAt);
    return result;
  };

  if (!apiKey) {
    console.error("OpenAI API key is not configured server-side.");
    return finish(
      failureResult(
        configuredModel,
        "OpenAI API key is not configured.",
        "missing_key",
        configuredModel,
        false,
      ),
    );
  }

  console.info("✓ OpenAI configured server-side", {
    model: configuredModel,
    fallbackModel,
    keyLoaded: true,
  });

  const modelsToTry =
    configuredModel === fallbackModel
      ? [configuredModel]
      : [configuredModel, fallbackModel];

  let lastError: AiGenerateTextResult | null = null;

  for (const model of modelsToTry) {
    const usedFallbackModel = model !== configuredModel;

    if (usedFallbackModel) {
      console.warn(
        `OpenAI model "${configuredModel}" unavailable; retrying with fallback "${fallbackModel}".`,
      );
    }

    try {
      const result = await requestChatCompletion(apiKey, model, input);

      if (result.ok) {
        return finish({
          success: true,
          text: result.text,
          model,
          promptTokens: result.usage.prompt_tokens ?? null,
          completionTokens: result.usage.completion_tokens ?? null,
          totalTokens: result.usage.total_tokens ?? null,
          error: null,
          errorCode: null,
          configuredModel,
          usedFallbackModel,
        });
      }

      const parsed = parseOpenAiErrorBody(result.body);
      const isEmpty = parsed?.code === "empty_response";

      lastError = failureResult(
        model,
        isEmpty ? "No draft text was returned." : "The drafting service couldn't respond right now.",
        isEmpty ? "empty_response" : "api_error",
        configuredModel,
        usedFallbackModel,
      );

      if (
        model === configuredModel &&
        modelsToTry.length > 1 &&
        (shouldFallbackToDefaultModel(result.status, result.body, model, fallbackModel) ||
          isEmpty)
      ) {
        console.warn(
          `OpenAI model "${model}" returned no usable draft text; retrying with "${fallbackModel}".`,
        );
        continue;
      }

      return finish(lastError);
    } catch (error) {
      console.error("OpenAI request failed:", error);
      lastError = failureResult(
        model,
        "The drafting service couldn't respond right now.",
        "api_error",
        configuredModel,
        usedFallbackModel,
      );

      if (model === configuredModel && modelsToTry.length > 1) {
        continue;
      }

      return finish(lastError);
    }
  }

  return finish(
    lastError ??
      failureResult(
        configuredModel,
        "The drafting service couldn't respond right now.",
        "api_error",
        configuredModel,
        false,
      ),
  );
}
