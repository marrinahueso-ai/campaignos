import "server-only";

import { generateText, getAiAssistantStatus } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { EVENT_TYPE_LABELS, DEFAULT_EVENT_TYPE } from "@/lib/playbooks/constants";
import type { Event } from "@/types";
import type { EventPlaybookInsightsResult, EventPlaybookNote, EventPlaybookTask } from "@/types/event-playbooks";

const MAX_LESSON_CHARS = 400;
const MAX_PAST_EVENTS = 3;

export interface PastEventLessons {
  eventTitle: string;
  eventDate: string;
  lessons: string[];
}

interface GenerateInsightsInput {
  event: Event;
  notes: EventPlaybookNote[];
  tasks: EventPlaybookTask[];
  pastLessons: PastEventLessons[];
}

const KEYWORD_RULES: {
  pattern: RegExp;
  recommendation: string;
  checklist: string;
}[] = [
  {
    pattern: /\b(parking|park(ing)? lot|directions?)\b/i,
    recommendation:
      "Share clear parking directions with volunteers and include them in the day-of run sheet.",
    checklist: "Confirm parking directions and share with volunteers",
  },
  {
    pattern: /\b(coffee|beverages?|drinks?)\b/i,
    recommendation:
      "Upgrade or confirm coffee and beverage service based on last year's feedback.",
    checklist: "Order coffee and beverages (confirm vendor and quantities)",
  },
  {
    pattern: /\b(seating|tables?|layout|organization)\b/i,
    recommendation:
      "Plan seating layout and team organization before guests arrive.",
    checklist: "Create seating chart and assign table/team organization",
  },
  {
    pattern: /\b(volunteer|staff|help)\b/i,
    recommendation:
      "Recruit and brief volunteers early with clear roles and timing.",
    checklist: "Confirm volunteer roster and send day-of assignments",
  },
  {
    pattern: /\b(signage|signs?|wayfinding)\b/i,
    recommendation: "Prepare signage for parking, registration, and key areas.",
    checklist: "Design and print event signage",
  },
];

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

function eventTypeLabel(eventType: string | null): string {
  return EVENT_TYPE_LABELS[eventType ?? DEFAULT_EVENT_TYPE] ?? "this event type";
}

function openTaskTitles(tasks: EventPlaybookTask[]): string[] {
  return tasks.filter((t) => t.status !== "done").map((t) => t.title);
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item.trim());
  }
  return result;
}

function buildFallbackInsights(input: GenerateInsightsInput): EventPlaybookInsightsResult {
  const lessons = input.notes.filter((n) => n.noteType === "lesson");
  const planningNotes = input.notes.filter((n) => n.noteType === "note");
  const allLessonTexts = [
    ...lessons.map((l) => l.content),
    ...input.pastLessons.flatMap((p) => p.lessons),
  ];

  const recommendations: string[] = [];
  const checklistItems: string[] = [];
  const existingOpen = new Set(openTaskTitles(input.tasks).map((t) => t.toLowerCase()));

  for (const text of allLessonTexts) {
    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(text)) {
        recommendations.push(rule.recommendation);
        if (!existingOpen.has(rule.checklist.toLowerCase())) {
          checklistItems.push(rule.checklist);
        }
      }
    }
  }

  for (const lesson of lessons) {
    const snippet = truncate(lesson.content, 120);
    recommendations.push(`Apply this lesson from ${input.event.title}: "${snippet}"`);
  }

  for (const past of input.pastLessons) {
    for (const lesson of past.lessons) {
      const snippet = truncate(lesson, 100);
      recommendations.push(
        `From ${past.eventTitle}: "${snippet}" — consider for this year's plan.`,
      );
    }
  }

  if (planningNotes.length > 0) {
    recommendations.push(
      `Review ${planningNotes.length} planning note${planningNotes.length === 1 ? "" : "s"} for open action items.`,
    );
  }

  if (recommendations.length === 0 && checklistItems.length === 0) {
    recommendations.push(
      "Capture lessons learned in the Notes tab after the event — insights will improve with each cycle.",
    );
    checklistItems.push(
      "Review default planning checklist and customize for this event",
    );
  }

  const pastLessonCount = input.pastLessons.reduce((sum, p) => sum + p.lessons.length, 0);

  return {
    recommendations: uniqueStrings(recommendations).slice(0, 8),
    checklistItems: uniqueStrings(checklistItems).slice(0, 10),
    sourceCounts: {
      currentLessons: lessons.length,
      currentNotes: planningNotes.length,
      pastLessons: pastLessonCount,
    },
    usedAi: false,
  };
}

function buildPrompt(input: GenerateInsightsInput): { system: string; user: string } {
  const lessons = input.notes.filter((n) => n.noteType === "lesson");
  const planningNotes = input.notes.filter((n) => n.noteType === "note");
  const typeLabel = eventTypeLabel(input.event.eventType);
  const openTasks = openTaskTitles(input.tasks);

  const currentLessonsBlock =
    lessons.length > 0
      ? lessons
          .map((l, i) => `${i + 1}. ${truncate(l.content, MAX_LESSON_CHARS)}`)
          .join("\n")
      : "(none)";

  const planningNotesBlock =
    planningNotes.length > 0
      ? planningNotes
          .map((n, i) => `${i + 1}. ${truncate(n.content, MAX_LESSON_CHARS)}`)
          .join("\n")
      : "(none)";

  const pastLessonsBlock =
    input.pastLessons.length > 0
      ? input.pastLessons
          .map((p) => {
            const items = p.lessons
              .map((l, i) => `  ${i + 1}. ${truncate(l, MAX_LESSON_CHARS)}`)
              .join("\n");
            return `${p.eventTitle} (${p.eventDate}):\n${items || "  (no lessons)"}`;
          })
          .join("\n\n")
      : "(none)";

  const openTasksBlock =
    openTasks.length > 0 ? openTasks.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(none)";

  return {
    system: `You are an expert PTA/event planning assistant. Given lessons learned and planning notes, produce actionable recommendations and a concrete planning checklist for an upcoming school event.

Respond with valid JSON only:
{
  "recommendations": ["string", ...],
  "checklistItems": ["string", ...]
}

Rules:
- recommendations: 3-8 specific, actionable suggestions derived from the lessons (not generic filler)
- checklistItems: 4-10 short task titles suitable for a planning checklist (verb-first, under 80 chars)
- Do NOT duplicate items already in the open tasks list
- Prioritize lessons from the current event, then past events of the same type
- Be practical: parking, logistics, food, seating, volunteers, timing, signage, etc.`,
    user: `Event: ${input.event.title}
Event type: ${typeLabel}
Date: ${input.event.date}
Location: ${input.event.location ?? "TBD"}

Lessons learned (this event):
${currentLessonsBlock}

Planning notes (this event):
${planningNotesBlock}

Lessons from past ${typeLabel} events:
${pastLessonsBlock}

Open checklist tasks (do not duplicate):
${openTasksBlock}`,
  };
}

function parseInsightsJson(text: string): { recommendations: string[]; checklistItems: string[] } | null {
  try {
    const parsed = JSON.parse(text) as {
      recommendations?: unknown;
      checklistItems?: unknown;
    };
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((r): r is string => typeof r === "string")
      : [];
    const checklistItems = Array.isArray(parsed.checklistItems)
      ? parsed.checklistItems.filter((r): r is string => typeof r === "string")
      : [];
    if (recommendations.length === 0 && checklistItems.length === 0) {
      return null;
    }
    return { recommendations, checklistItems };
  } catch {
    return null;
  }
}

export async function generateEventPlaybookInsights(
  input: GenerateInsightsInput,
): Promise<EventPlaybookInsightsResult> {
  const lessons = input.notes.filter((n) => n.noteType === "lesson");
  const planningNotes = input.notes.filter((n) => n.noteType === "note");
  const pastLessonCount = input.pastLessons.reduce((sum, p) => sum + p.lessons.length, 0);

  const sourceCounts = {
    currentLessons: lessons.length,
    currentNotes: planningNotes.length,
    pastLessons: pastLessonCount,
  };

  const aiStatus = getAiAssistantStatus();
  if (!aiStatus.available) {
    return { ...buildFallbackInsights(input), sourceCounts };
  }

  const { system, user } = buildPrompt(input);
  const result = await generateText({
    systemPrompt: system,
    userPrompt: user,
    model: resolveFastDraftModel(),
    maxTokens: 1024,
    temperature: 0.5,
    jsonMode: true,
  });

  if (!result.success || !result.text) {
    return { ...buildFallbackInsights(input), sourceCounts };
  }

  const parsed = parseInsightsJson(result.text);
  if (!parsed) {
    return { ...buildFallbackInsights(input), sourceCounts };
  }

  const existingOpen = new Set(openTaskTitles(input.tasks).map((t) => t.toLowerCase()));
  const checklistItems = uniqueStrings(parsed.checklistItems).filter(
    (item) => !existingOpen.has(item.toLowerCase()),
  );

  return {
    recommendations: uniqueStrings(parsed.recommendations).slice(0, 8),
    checklistItems: checklistItems.slice(0, 10),
    sourceCounts,
    usedAi: true,
  };
}

export { MAX_PAST_EVENTS };
