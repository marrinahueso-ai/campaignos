import { createClient } from "@/lib/supabase/server";
import { calculateCommunicationHealth } from "@/lib/playbooks/health";
import {
  mapCommunicationPlaybookRow,
  mapCommunicationPlaybookStepRow,
  mapEventCommunicationStepRow,
  mapEventPlaybookAssignmentRow,
} from "@/lib/playbooks/mappers";
import { DEFAULT_EVENT_TYPE, SYSTEM_PLAYBOOK_IDS } from "@/lib/playbooks/constants";
import type {
  CommunicationPlaybook,
  CommunicationPlaybookRow,
  CommunicationPlaybookStep,
  CommunicationPlaybookStepRow,
  EventCommunicationStep,
  EventCommunicationStepRow,
  EventPlaybookAssignmentRow,
  EventPlaybookData,
  EventType,
} from "@/types/playbooks";

export async function arePlaybookTablesAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("communication_playbooks")
    .select("id")
    .limit(1);

  return !error || error.code !== "42P01";
}

async function getHiddenPlaybookIdsForOrganization(
  organizationId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_hidden_playbooks")
    .select("playbook_id")
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "42P01") {
      return new Set();
    }
    console.error("Failed to fetch hidden playbooks:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.playbook_id as string));
}

export async function getPlaybooksForOrganization(
  organizationId: string | null,
): Promise<CommunicationPlaybook[]> {
  const supabase = await createClient();

  let query = supabase
    .from("communication_playbooks")
    .select("*")
    .eq("is_archived", false)
    .order("name", { ascending: true });

  if (organizationId) {
    query = query.or(
      `organization_id.eq.${organizationId},and(organization_id.is.null,is_system.eq.true)`,
    );
  } else {
    query = query.eq("is_system", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch playbooks:", error.message);
    return [];
  }

  let rows = (data ?? []) as CommunicationPlaybookRow[];

  if (organizationId) {
    const hiddenIds = await getHiddenPlaybookIdsForOrganization(organizationId);
    if (hiddenIds.size > 0) {
      rows = rows.filter((row) => !hiddenIds.has(row.id));
    }
  }
  const playbookIds = rows.map((row) => row.id);

  const stepCounts = await getStepCountsByPlaybookIds(playbookIds);

  return rows.map((row) =>
    mapCommunicationPlaybookRow(row, stepCounts.get(row.id) ?? 0),
  );
}

async function getStepCountsByPlaybookIds(
  playbookIds: string[],
): Promise<Map<string, number>> {
  if (playbookIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_playbook_steps")
    .select("playbook_id")
    .in("playbook_id", playbookIds);

  if (error || !data) {
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data) {
    const id = row.playbook_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export async function getPlaybookById(
  playbookId: string,
): Promise<CommunicationPlaybook | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("communication_playbooks")
    .select("*")
    .eq("id", playbookId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as CommunicationPlaybookRow;
  const stepCounts = await getStepCountsByPlaybookIds([row.id]);

  return mapCommunicationPlaybookRow(row, stepCounts.get(row.id) ?? 0);
}

export async function getPlaybookSteps(
  playbookId: string,
): Promise<CommunicationPlaybookStep[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("communication_playbook_steps")
    .select("*")
    .eq("playbook_id", playbookId)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as CommunicationPlaybookStepRow[]).map(
    mapCommunicationPlaybookStepRow,
  );
}

export async function getPlaybookWithSteps(playbookId: string): Promise<{
  playbook: CommunicationPlaybook;
  steps: CommunicationPlaybookStep[];
} | null> {
  const playbook = await getPlaybookById(playbookId);
  if (!playbook) return null;

  const steps = await getPlaybookSteps(playbookId);
  return { playbook, steps };
}

export async function getDefaultPlaybookIdForEventType(
  eventType: EventType,
  organizationId: string | null,
): Promise<string> {
  if (organizationId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organization_playbook_defaults")
      .select("playbook_id")
      .eq("organization_id", organizationId)
      .eq("event_type", eventType)
      .maybeSingle();

    if (data?.playbook_id) {
      return data.playbook_id as string;
    }
  }

  return SYSTEM_PLAYBOOK_IDS[eventType] ?? SYSTEM_PLAYBOOK_IDS[DEFAULT_EVENT_TYPE];
}

export async function getEventPlaybookData(
  eventId: string,
): Promise<EventPlaybookData | null> {
  const supabase = await createClient();

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("event_playbook_assignments")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (assignmentError?.code === "42P01") {
    return null;
  }

  if (assignmentError || !assignmentData) {
    return null;
  }

  const assignment = mapEventPlaybookAssignmentRow(
    assignmentData as EventPlaybookAssignmentRow,
  );

  const [playbook, stepsResult] = await Promise.all([
    getPlaybookById(assignment.playbookId),
    supabase
      .from("event_communication_steps")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!playbook) {
    return null;
  }

  const steps = ((stepsResult.data ?? []) as EventCommunicationStepRow[]).map(
    mapEventCommunicationStepRow,
  );

  const health = calculateCommunicationHealth(steps);

  return {
    assignment,
    playbook,
    steps,
    healthPercent: health.healthPercent,
  };
}

export async function getEventCommunicationSteps(
  eventId: string,
): Promise<EventCommunicationStep[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_communication_steps")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as EventCommunicationStepRow[]).map(mapEventCommunicationStepRow);
}

export async function getDashboardCommunicationHealth(): Promise<{
  healthPercent: number;
  eventsWithPlaybooks: number;
  totalRequiredSteps: number;
  completedRequiredSteps: number;
}> {
  const supabase = await createClient();

  const { data: assignments, error } = await supabase
    .from("event_playbook_assignments")
    .select("event_id");

  if (error || !assignments || assignments.length === 0) {
    return {
      healthPercent: 0,
      eventsWithPlaybooks: 0,
      totalRequiredSteps: 0,
      completedRequiredSteps: 0,
    };
  }

  const eventIds = assignments.map((a) => a.event_id as string);

  const { data: stepsData } = await supabase
    .from("event_communication_steps")
    .select("*")
    .in("event_id", eventIds);

  const allSteps = ((stepsData ?? []) as EventCommunicationStepRow[]).map(
    mapEventCommunicationStepRow,
  );

  const requiredSteps = allSteps.filter((step) => step.isRequired);
  const completedRequired = requiredSteps.filter(
    (step) => step.status === "completed",
  ).length;

  const healthPercent =
    requiredSteps.length > 0
      ? Math.round((completedRequired / requiredSteps.length) * 100)
      : 0;

  return {
    healthPercent,
    eventsWithPlaybooks: eventIds.length,
    totalRequiredSteps: requiredSteps.length,
    completedRequiredSteps: completedRequired,
  };
}

export async function getEventHealthByEventIds(
  eventIds: string[],
): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_communication_steps")
    .select("*")
    .in("event_id", eventIds);

  const stepsByEvent = new Map<string, EventCommunicationStep[]>();

  for (const row of (data ?? []) as EventCommunicationStepRow[]) {
    const step = mapEventCommunicationStepRow(row);
    const existing = stepsByEvent.get(step.eventId) ?? [];
    existing.push(step);
    stepsByEvent.set(step.eventId, existing);
  }

  const healthMap = new Map<string, number>();
  for (const [eventId, steps] of stepsByEvent) {
    healthMap.set(eventId, calculateCommunicationHealth(steps).healthPercent);
  }

  return healthMap;
}
