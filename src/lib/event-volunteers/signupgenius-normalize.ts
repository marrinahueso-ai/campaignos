import {
  buildSnapshotFromAssignments,
  coerceNonNegativeInt,
} from "@/lib/event-volunteers/stats";
import type {
  VolunteerSignupAssignment,
  VolunteerSignupParticipant,
  VolunteerSignupSnapshot,
} from "@/lib/event-volunteers/types";
import { VOLUNTEER_PARSE_VERSION } from "@/lib/event-volunteers/types";

type SugSlotItem = {
  item?: unknown;
  itemcomment?: unknown;
  itemDescription?: unknown;
  qty?: unknown;
  qtyTaken?: unknown;
  participantCount?: unknown;
  hideNumberWanted?: unknown;
  slotitemid?: unknown;
  itemid?: unknown;
  itemorder?: unknown;
};

type SugSlot = {
  starttime?: unknown;
  endtime?: unknown;
  location?: unknown;
  items?: SugSlotItem[];
};

type SugParticipantRow = {
  firstname?: unknown;
  lastname?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  /** Intentionally ignored — we do not store or surface email. */
  email?: unknown;
  participantid?: unknown;
  participantId?: unknown;
  id?: unknown;
  myqty?: unknown;
};

export type SugSignupData = {
  slots?: Record<string, SugSlot>;
  participants?: unknown;
  closedateutc?: unknown;
  beforemessage?: unknown;
  aftermessage?: unknown;
  shownames?: unknown;
};

function sanitizeText(value: unknown, max = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, max);
}

function parseSugDateTime(value: unknown): {
  date?: string;
  time?: string;
  raw?: string;
} {
  const raw = sanitizeText(value, 80);
  if (!raw) return {};
  const match = raw.match(
    /^([A-Za-z]+),?\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?/,
  );
  if (!match) {
    return { raw };
  }
  const monthName = match[1]!.toLowerCase();
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const month = months[monthName];
  if (!month) return { raw };
  const day = match[2]!.padStart(2, "0");
  const year = match[3]!;
  const hour = match[4]!.padStart(2, "0");
  const minute = match[5]!;
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    raw,
  };
}

function formatClock(time: string | undefined): string | undefined {
  if (!time) return undefined;
  const [hRaw, m] = time.split(":");
  const h = Number(hRaw);
  if (!Number.isFinite(h) || !m) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${m} ${suffix}`;
}

function participantDisplayName(row: SugParticipantRow): string | undefined {
  const first =
    sanitizeText(row.firstname, 80) ?? sanitizeText(row.firstName, 80);
  const last =
    sanitizeText(row.lastname, 80) ?? sanitizeText(row.lastName, 80);
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined || undefined;
}

function participantStableKey(
  row: SugParticipantRow,
  assignmentExternalKey: string,
  index: number,
): string {
  const raw =
    row.participantid ?? row.participantId ?? row.id ?? undefined;
  if (raw != null && String(raw).length > 0) {
    return String(raw).slice(0, 120);
  }
  const name = participantDisplayName(row) ?? "volunteer";
  return `${assignmentExternalKey}:${index}:${name}`.slice(0, 200);
}

/**
 * Parse SUG `participants` map (keyed by slotitemid) into typed people.
 * Name only — email and other PII fields are never copied into the result.
 */
export function parseSignUpGeniusParticipants(
  rawParticipants: unknown,
  assignmentsByExternalKey: Map<string, VolunteerSignupAssignment>,
): VolunteerSignupParticipant[] {
  if (!rawParticipants || typeof rawParticipants !== "object") {
    return [];
  }

  const people: VolunteerSignupParticipant[] = [];
  const entries = Object.entries(rawParticipants as Record<string, unknown>);
  entries.sort(([a], [b]) => a.localeCompare(b));

  for (const [slotKey, value] of entries) {
    const assignment =
      assignmentsByExternalKey.get(String(slotKey)) ??
      assignmentsByExternalKey.get(String(coerceNonNegativeInt(slotKey) ?? slotKey));
    const rows = Array.isArray(value) ? value : [];

    rows.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      const row = entry as SugParticipantRow;
      const name = participantDisplayName(row);
      if (!name) return;

      const assignmentExternalKey = assignment?.externalKey ?? String(slotKey);
      people.push({
        participantKey: participantStableKey(row, assignmentExternalKey, index),
        assignmentExternalKey,
        name,
        roleName: assignment?.name ?? "Volunteer",
        date: assignment?.date,
        startTime: assignment?.startTime,
        endTime: assignment?.endTime,
        location: assignment?.location,
        status: "confirmed",
      });
    });
  }

  return people;
}

export function normalizeSignUpGeniusPayload(
  data: SugSignupData,
  meta: { sourceTitle?: string; sourceUrl: string },
): VolunteerSignupSnapshot | { error: "changed_markup" | "empty_parse" } {
  const slots = data.slots;
  if (!slots || typeof slots !== "object") {
    return { error: "changed_markup" };
  }

  const assignments: VolunteerSignupAssignment[] = [];
  const slotEntries = Object.entries(slots);
  slotEntries.sort(([a], [b]) => a.localeCompare(b));

  for (const [, slot] of slotEntries) {
    if (!slot || typeof slot !== "object") continue;
    const start = parseSugDateTime(slot.starttime);
    const end = parseSugDateTime(slot.endtime);
    const location = sanitizeText(slot.location, 200);
    const items = Array.isArray(slot.items) ? slot.items : [];

    const ordered = [...items].sort((left, right) => {
      const lo = coerceNonNegativeInt(left.itemorder) ?? 0;
      const ro = coerceNonNegativeInt(right.itemorder) ?? 0;
      return lo - ro;
    });

    for (const item of ordered) {
      const name =
        sanitizeText(item.item, 200) ||
        sanitizeText(item.itemcomment, 200) ||
        "Untitled assignment";
      const description = sanitizeText(item.itemDescription, 500);
      const hideWanted = Boolean(item.hideNumberWanted);
      const requested = hideWanted ? null : coerceNonNegativeInt(item.qty);
      const filledRaw =
        coerceNonNegativeInt(item.qtyTaken) ??
        coerceNonNegativeInt(item.participantCount);
      const filled =
        filledRaw !== null
          ? filledRaw
          : requested !== null &&
              (item.qtyTaken === "" ||
                item.qtyTaken === null ||
                item.qtyTaken === undefined)
            ? 0
            : null;
      const open =
        requested !== null && filled !== null
          ? Math.max(0, requested - filled)
          : null;
      const slotItemId = item.slotitemid;
      const itemId = item.itemid;
      const externalKey: string =
        slotItemId != null && String(slotItemId).length > 0
          ? String(slotItemId)
          : itemId != null && String(itemId).length > 0
            ? String(itemId)
            : `${name}-${assignments.length}`;

      assignments.push({
        externalKey,
        name,
        description,
        date: start.date,
        startTime: formatClock(start.time),
        endTime: formatClock(end.time),
        location,
        quantityRequested: requested,
        quantityFilled: filled,
        quantityOpen: open,
      });
    }
  }

  if (assignments.length === 0) {
    return { error: "empty_parse" };
  }

  const assignmentsByExternalKey = new Map(
    assignments.map((assignment) => [assignment.externalKey, assignment]),
  );
  const participants = parseSignUpGeniusParticipants(
    data.participants,
    assignmentsByExternalKey,
  );

  const deadline = sanitizeText(data.closedateutc, 80);
  const { snapshot } = buildSnapshotFromAssignments({
    sourceTitle: meta.sourceTitle,
    sourceDescription: sanitizeText(data.beforemessage, 500),
    sourceLocation: assignments.find((a) => a.location)?.location,
    signupDeadline: deadline,
    parseVersion: VOLUNTEER_PARSE_VERSION,
    assignments,
    participants,
  });

  return snapshot;
}
