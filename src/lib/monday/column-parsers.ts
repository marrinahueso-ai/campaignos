import { parseMondayDateColumn } from "@/lib/monday/status-mapping";
import type {
  MondayBoardColumnMap,
  MondayItemColumnValues,
  MondayPersonValue,
  MondayRawColumnValue,
  MondaySubitemColumnValues,
  MondayTimelineValue,
} from "@/lib/monday/types";

function rawColumn(
  id: string,
  type: string,
  text: string | null,
  value: string | null,
): MondayRawColumnValue {
  return { id, type, text, value };
}

function indexColumnValues(
  columnValues: { id: string; type: string; text: string | null; value: string | null }[],
): Record<string, MondayRawColumnValue> {
  const index: Record<string, MondayRawColumnValue> = {};
  for (const column of columnValues) {
    index[column.id] = rawColumn(column.id, column.type, column.text, column.value);
  }
  return index;
}

function getRaw(
  index: Record<string, MondayRawColumnValue>,
  columnId: string | null | undefined,
): MondayRawColumnValue | null {
  if (!columnId) {
    return null;
  }
  return index[columnId] ?? null;
}

export function parseMondayPeopleColumn(
  column: MondayRawColumnValue | null,
): MondayPersonValue[] {
  if (!column) {
    return [];
  }

  if (column.text?.trim()) {
    return column.text.split(",").map((name) => ({
      id: null,
      name: name.trim(),
    }));
  }

  if (!column.value) {
    return [];
  }

  try {
    const parsed = JSON.parse(column.value) as {
      personsAndTeams?: { id?: number | string; kind?: string }[];
    };
    const entries = parsed.personsAndTeams ?? [];
    return entries.map((entry) => ({
      id: entry.id != null ? String(entry.id) : null,
      name: "",
    }));
  } catch {
    return [];
  }
}

export function parseMondayTimelineColumn(
  column: MondayRawColumnValue | null,
): MondayTimelineValue | null {
  if (!column?.value) {
    if (column?.text?.includes(" - ")) {
      const [from, to] = column.text.split(" - ").map((part) => part.trim().slice(0, 10));
      return { from: from || null, to: to || null };
    }
    return null;
  }

  try {
    const parsed = JSON.parse(column.value) as { from?: string; to?: string };
    return {
      from: parsed.from?.slice(0, 10) ?? null,
      to: parsed.to?.slice(0, 10) ?? null,
    };
  } catch {
    return null;
  }
}

export function parseMondayStatusLabel(column: MondayRawColumnValue | null): string | null {
  return column?.text?.trim() || null;
}

export function parseMainItemColumnValues(
  columnValues: { id: string; type: string; text: string | null; value: string | null }[],
  columnMap: MondayBoardColumnMap,
): MondayItemColumnValues {
  const raw = indexColumnValues(columnValues);

  const committeeRaw = getRaw(raw, columnMap.committeeColumnId);
  const committeePeople = parseMondayPeopleColumn(committeeRaw);

  return {
    status: parseMondayStatusLabel(getRaw(raw, columnMap.statusColumnId)),
    priority: parseMondayStatusLabel(getRaw(raw, columnMap.priorityColumnId)),
    phase: parseMondayStatusLabel(getRaw(raw, columnMap.phaseColumnId)),
    urgency: parseMondayStatusLabel(getRaw(raw, columnMap.urgencyColumnId)),
    dueDate: parseMondayDateColumn(
      getRaw(raw, columnMap.dueDateColumnId)?.text ?? null,
      getRaw(raw, columnMap.dueDateColumnId)?.value ?? null,
    ),
    timeline: parseMondayTimelineColumn(getRaw(raw, columnMap.timelineColumnId)),
    vp: parseMondayPeopleColumn(getRaw(raw, columnMap.vpColumnId)),
    president: parseMondayPeopleColumn(getRaw(raw, columnMap.presidentColumnId)),
    committee:
      committeeRaw?.text?.trim() ??
      (committeePeople.map((p) => p.name).join(", ") || null),
    committeePeople,
    raw,
  };
}

export function parseSubitemColumnValues(
  columnValues: { id: string; type: string; text: string | null; value: string | null }[],
  columnMap: MondayBoardColumnMap,
): MondaySubitemColumnValues {
  const raw = indexColumnValues(columnValues);

  return {
    status: parseMondayStatusLabel(getRaw(raw, columnMap.subitemStatusColumnId)),
    owner: parseMondayPeopleColumn(getRaw(raw, columnMap.subitemOwnerColumnId)),
    date: parseMondayDateColumn(
      getRaw(raw, columnMap.subitemDateColumnId)?.text ?? null,
      getRaw(raw, columnMap.subitemDateColumnId)?.value ?? null,
    ),
    raw,
  };
}

export function buildMondayStatusColumnValue(label: string): Record<string, unknown> {
  return { label };
}

export function buildMondayTimelineColumnValue(input: {
  from: string | null;
  to: string | null;
}): Record<string, unknown> | null {
  if (!input.from && !input.to) {
    return null;
  }
  return {
    from: input.from,
    to: input.to,
  };
}

export function buildMondayDateColumnValue(date: string | null): Record<string, unknown> | null {
  if (!date) {
    return null;
  }
  return { date };
}
