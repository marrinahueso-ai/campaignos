import "server-only";

import { generateText, getAiAssistantStatus } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { DEFAULT_EVENT_TYPE, EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import type { Event } from "@/types";
import type { EventPlaybookTask } from "@/types/event-playbooks";
import type { EventType } from "@/types/playbooks";

const MAX_EXISTING_TASKS = 40;
const MAX_PROMPT_CHARS = 800;
const MAX_SUGGESTIONS = 10;

export interface GenerateTasksV2Input {
  event: Event;
  existingTasks: EventPlaybookTask[];
  userPrompt: string;
}

export interface GenerateTasksV2Result {
  tasks: string[];
  usedAi: boolean;
  message: string | null;
}

function eventTypeLabel(eventType: string | null): string {
  return (
    EVENT_TYPE_LABELS[(eventType ?? DEFAULT_EVENT_TYPE) as EventType] ??
    "school event"
  );
}

function uniqueTaskTitles(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim().replace(/\s+/g, " ");
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed.slice(0, 120));
  }
  return result;
}

function openTaskTitles(tasks: EventPlaybookTask[]): string[] {
  return tasks
    .filter((task) => task.status !== "done")
    .map((task) => task.title.trim())
    .filter(Boolean)
    .slice(0, MAX_EXISTING_TASKS);
}

function buildFallbackTasks(input: GenerateTasksV2Input): string[] {
  const prompt = input.userPrompt.trim().toLowerCase();
  const existing = new Set(
    openTaskTitles(input.existingTasks).map((title) => title.toLowerCase()),
  );
  const suggestions: string[] = [];

  const push = (title: string) => {
    if (!existing.has(title.toLowerCase())) {
      suggestions.push(title);
    }
  };

  if (/\bvolunteer|staff|help\b/.test(prompt)) {
    push("Confirm volunteer roster and day-of roles");
    push("Send volunteer briefing with arrival times");
  }
  if (/\bfood|snack|coffee|beverage|cater\b/.test(prompt)) {
    push("Finalize food/beverage order and quantities");
    push("Confirm vendor delivery time");
  }
  if (/\bparking|signage|signs?\b/.test(prompt)) {
    push("Prepare parking and wayfinding signage");
  }
  if (/\bcomm|post|social|email|flyer|market\b/.test(prompt)) {
    push("Draft reminder post for families");
    push("Schedule final day-of announcement");
  }
  if (/\bsetup|tear.?down|logistics|supply\b/.test(prompt)) {
    push("Build setup checklist and supply list");
    push("Assign tear-down leads");
  }

  push(`Review open planning items for ${input.event.title}`);
  push("Confirm owners and due dates for critical path tasks");
  push("Prepare day-of run sheet");

  if (input.userPrompt.trim()) {
    push(`Follow up on: ${input.userPrompt.trim().slice(0, 80)}`);
  }

  return uniqueTaskTitles(suggestions).slice(0, MAX_SUGGESTIONS);
}

function buildPrompt(input: GenerateTasksV2Input): {
  system: string;
  user: string;
} {
  const openTasks = openTaskTitles(input.existingTasks);
  const openTasksBlock =
    openTasks.length > 0
      ? openTasks.map((title, index) => `${index + 1}. ${title}`).join("\n")
      : "(none)";
  const focus =
    input.userPrompt.trim().slice(0, MAX_PROMPT_CHARS) ||
    "(user did not add extra focus — suggest practical planning tasks for this event)";

  return {
    system: `You are an expert PTA/PTO event planning assistant for school campaigns.

Given an event and what the organizer is currently working on, suggest concrete tasks.

Respond with valid JSON only:
{
  "tasks": ["string", ...]
}

Rules:
- Return 5-10 short task titles (verb-first, under 80 characters)
- Ground suggestions in BOTH the event details AND the user's focus text
- Do NOT duplicate open tasks already listed
- Be practical for school/PTO work: volunteers, logistics, communications, supplies, approvals, day-of ops
- No numbering, no markdown, no commentary outside JSON`,
    user: `Event: ${input.event.title}
Event type: ${eventTypeLabel(input.event.eventType)}
Date: ${input.event.date}
Location: ${input.event.location ?? "TBD"}
Audience: ${input.event.audience ?? "TBD"}
Description: ${input.event.description?.trim() || "(none)"}

What the organizer is working on:
${focus}

Open tasks already on this event (do not duplicate):
${openTasksBlock}`,
  };
}

function parseTasksJson(text: string): string[] | null {
  try {
    const parsed = JSON.parse(text) as { tasks?: unknown };
    if (!Array.isArray(parsed.tasks)) {
      return null;
    }
    const tasks = parsed.tasks.filter(
      (item): item is string => typeof item === "string",
    );
    return tasks.length > 0 ? tasks : null;
  } catch {
    return null;
  }
}

export async function generateTasksForEvent(
  input: GenerateTasksV2Input,
): Promise<GenerateTasksV2Result> {
  const existing = new Set(
    openTaskTitles(input.existingTasks).map((title) => title.toLowerCase()),
  );
  const aiStatus = getAiAssistantStatus();

  if (!aiStatus.available) {
    return {
      tasks: buildFallbackTasks(input).filter(
        (title) => !existing.has(title.toLowerCase()),
      ),
      usedAi: false,
      message:
        aiStatus.reason ??
        "AI is not configured — showing practical suggestions from event context.",
    };
  }

  const { system, user } = buildPrompt(input);
  const result = await generateText({
    systemPrompt: system,
    userPrompt: user,
    model: resolveFastDraftModel(),
    maxTokens: 900,
    temperature: 0.4,
    jsonMode: true,
    usage: {
      actionType: "tasks_generate",
      eventId: input.event.id,
      feature: "tasks_generate",
    },
  });

  if (!result.success || !result.text) {
    return {
      tasks: buildFallbackTasks(input).filter(
        (title) => !existing.has(title.toLowerCase()),
      ),
      usedAi: false,
      message: result.error ?? "AI generation failed — using fallback suggestions.",
    };
  }

  const parsed = parseTasksJson(result.text);
  if (!parsed) {
    return {
      tasks: buildFallbackTasks(input).filter(
        (title) => !existing.has(title.toLowerCase()),
      ),
      usedAi: false,
      message: "Could not parse AI response — using fallback suggestions.",
    };
  }

  const tasks = uniqueTaskTitles(parsed)
    .filter((title) => !existing.has(title.toLowerCase()))
    .slice(0, MAX_SUGGESTIONS);

  return {
    tasks,
    usedAi: true,
    message: tasks.length === 0 ? "No new tasks to suggest — try a more specific focus." : null,
  };
}
