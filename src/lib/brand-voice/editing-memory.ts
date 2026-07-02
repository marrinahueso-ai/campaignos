import { promises as fs } from "fs";
import path from "path";
import type {
  EditingMemoryRecord,
  EditingMemorySummary,
  RecordEditingMemoryInput,
} from "@/lib/brand-voice/types";
import type { CommunicationChannel } from "@/types/event-workspace";

const MEMORY_FILENAME = "brand-voice-editing-memory.json";

interface EditingMemoryStore {
  records: EditingMemoryRecord[];
}

function memoryFilePath(): string {
  return path.join(process.cwd(), ".campaignos", MEMORY_FILENAME);
}

async function readStore(): Promise<EditingMemoryStore> {
  try {
    const raw = await fs.readFile(memoryFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as EditingMemoryStore;
    return { records: parsed.records ?? [] };
  } catch {
    return { records: [] };
  }
}

async function writeStore(store: EditingMemoryStore): Promise<void> {
  const filePath = memoryFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

export function compareDraftToApprovedEdit(
  aiDraft: string,
  approvedEdit: string,
): string[] {
  const learnings: string[] = [];
  const aiLower = aiDraft.toLowerCase();
  const editLower = approvedEdit.toLowerCase();

  if (approvedEdit.length < aiDraft.length * 0.85) {
    learnings.push("Volunteers prefer shorter, tighter copy — trim filler.");
  }

  if (approvedEdit.length > aiDraft.length * 1.15) {
    learnings.push("Volunteers added more detail — include helpful context when facts support it.");
  }

  for (const corporate of CORPORATE_REMOVED_SIGNALS) {
    if (aiLower.includes(corporate) && !editLower.includes(corporate)) {
      learnings.push(`Avoid corporate phrasing like "${corporate}".`);
    }
  }

  const editWords = tokenize(approvedEdit);
  const aiWords = new Set(tokenize(aiDraft));
  const addedWarmWords = editWords.filter(
    (word) => WARM_WORDS.has(word) && !aiWords.has(word),
  );
  if (addedWarmWords.length > 0) {
    learnings.push(
      `Prefer warmer community language (e.g., ${addedWarmWords.slice(0, 3).join(", ")}).`,
    );
  }

  const editPhrases = extractDistinctPhrases(approvedEdit, aiDraft);
  for (const phrase of editPhrases.slice(0, 2)) {
    learnings.push(`Preferred phrasing: "${phrase}".`);
  }

  if (countExclamations(approvedEdit) < countExclamations(aiDraft)) {
    learnings.push("Use fewer exclamation marks — keep enthusiasm natural.");
  }

  return [...new Set(learnings)].slice(0, 6);
}

const CORPORATE_REMOVED_SIGNALS = [
  "excited to announce",
  "we are pleased",
  "dear valued",
  "don't miss",
  "stakeholder",
  "leverage",
];

const WARM_WORDS = new Set([
  "families",
  "community",
  "together",
  "welcome",
  "thank",
  "grateful",
  "join",
  "hope",
  "love",
  "support",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function extractDistinctPhrases(edit: string, ai: string): string[] {
  const editSentences = edit.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  const aiLower = ai.toLowerCase();
  return editSentences.filter(
    (sentence) =>
      sentence.length > 15 &&
      sentence.length < 120 &&
      !aiLower.includes(sentence.toLowerCase().slice(0, 30)),
  );
}

function countExclamations(text: string): number {
  return (text.match(/!/g) ?? []).length;
}

export async function appendEditingMemoryRecord(
  input: RecordEditingMemoryInput,
): Promise<EditingMemoryRecord | null> {
  const learnings = compareDraftToApprovedEdit(input.aiDraft, input.approvedEdit);
  if (learnings.length === 0) {
    return null;
  }

  const record: EditingMemoryRecord = {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    eventId: input.eventId,
    communicationItemId: input.communicationItemId,
    channel: input.channel,
    aiDraftPreview: input.aiDraft.slice(0, 500),
    approvedEditPreview: input.approvedEdit.slice(0, 500),
    learnings,
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  store.records.push(record);
  await writeStore(store);

  return record;
}

export async function loadEditingMemorySummary(input: {
  organizationId: string | null;
  channel?: CommunicationChannel;
  limit?: number;
}): Promise<EditingMemorySummary> {
  if (!input.organizationId) {
    return { hasRecords: false, recentLearnings: [], channelLearnings: [] };
  }

  const store = await readStore();
  const orgRecords = store.records
    .filter((record) => record.organizationId === input.organizationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const channelRecords = input.channel
    ? orgRecords.filter((record) => record.channel === input.channel)
    : orgRecords;

  const limit = input.limit ?? 8;
  const recentLearnings = uniqueLearnings(orgRecords, limit);
  const channelLearnings = uniqueLearnings(channelRecords, Math.min(limit, 5));

  return {
    hasRecords: orgRecords.length > 0,
    recentLearnings,
    channelLearnings,
  };
}

function uniqueLearnings(records: EditingMemoryRecord[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const record of records) {
    for (const learning of record.learnings) {
      if (!seen.has(learning)) {
        seen.add(learning);
        result.push(learning);
        if (result.length >= limit) return result;
      }
    }
  }

  return result;
}

export async function getLatestAiDraftForItem(
  communicationItemId: string,
): Promise<string | null> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data } = await supabase
    .from("communication_versions")
    .select("content, created_by")
    .eq("communication_item_id", communicationItemId)
    .order("version_number", { ascending: false })
    .limit(3);

  if (!data?.length) return null;

  const aiVersion = data.find(
    (row) => row.created_by === "CampaignOS Assistant",
  );
  return (aiVersion?.content as string) ?? (data[0]?.content as string) ?? null;
}
