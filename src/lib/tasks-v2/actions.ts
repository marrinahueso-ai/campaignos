"use server";

import { revalidatePath } from "next/cache";
import { getEventById } from "@/lib/events/queries";
import { getEventPlaybookHubData } from "@/lib/event-playbooks/queries";
import { reportIntegrationError } from "@/lib/monitoring/report-error";
import { createTaskHubTaskAction } from "@/lib/task-hub/actions";
import { assertTaskHubEventAccess } from "@/lib/task-hub/permissions";
import { generateTasksForEvent } from "@/lib/tasks-v2/generate-tasks";

export async function generateTasksV2Action(input: {
  eventId: string;
  userPrompt: string;
}): Promise<{
  success: boolean;
  error: string | null;
  tasks: string[];
  usedAi: boolean;
  message: string | null;
}> {
  const access = await assertTaskHubEventAccess(input.eventId);
  if (!access.ok) {
    return {
      success: false,
      error: access.error,
      tasks: [],
      usedAi: false,
      message: null,
    };
  }

  const event = await getEventById(input.eventId);
  if (!event) {
    return {
      success: false,
      error: "Event not found.",
      tasks: [],
      usedAi: false,
      message: null,
    };
  }

  try {
    const hubData = await getEventPlaybookHubData(input.eventId);
    const result = await generateTasksForEvent({
      event,
      existingTasks: hubData.tasks,
      userPrompt: input.userPrompt,
    });

    return {
      success: true,
      error: null,
      tasks: result.tasks,
      usedAi: result.usedAi,
      message: result.message,
    };
  } catch (error) {
    reportIntegrationError("ai", error, {
      action: "generateTasksV2Action",
      eventId: input.eventId,
      message:
        error instanceof Error ? error.message : "Task generation failed",
    });
    return {
      success: false,
      error: "Could not generate tasks. Try again in a moment.",
      tasks: [],
      usedAi: false,
      message: null,
    };
  }
}

export async function addGeneratedTasksV2Action(input: {
  eventId: string;
  titles: string[];
}): Promise<{
  success: boolean;
  error: string | null;
  addedCount: number;
  skippedDuplicates: number;
}> {
  const access = await assertTaskHubEventAccess(input.eventId);
  if (!access.ok) {
    return {
      success: false,
      error: access.error,
      addedCount: 0,
      skippedDuplicates: 0,
    };
  }

  const hubData = await getEventPlaybookHubData(input.eventId);
  const existing = new Set(
    hubData.tasks.map((task) => task.title.trim().toLowerCase()),
  );

  let addedCount = 0;
  let skippedDuplicates = 0;

  for (const rawTitle of input.titles) {
    const title = rawTitle.trim();
    if (!title) {
      continue;
    }
    if (existing.has(title.toLowerCase())) {
      skippedDuplicates += 1;
      continue;
    }

    const created = await createTaskHubTaskAction(input.eventId, { title });
    if (!created.success) {
      return {
        success: false,
        error: created.error ?? "Unable to create task.",
        addedCount,
        skippedDuplicates,
      };
    }

    existing.add(title.toLowerCase());
    addedCount += 1;
  }

  revalidatePath("/tasks");
  revalidatePath(`/events/${input.eventId}`);
  return { success: true, error: null, addedCount, skippedDuplicates };
}
