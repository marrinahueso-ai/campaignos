import type { CampaignIntelligence } from "@/lib/campaign-intelligence/types";

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function readyChannelNames(doneItems: string[]): string[] {
  return doneItems
    .map((item) => {
      const draftReady = item.match(/^(.+) draft ready$/);
      if (draftReady) return draftReady[1]!;
      const approved = item.match(/^(.+) approved$/);
      if (approved) return approved[1]!;
      const published = item.match(/^(.+) published$/);
      if (published) return published[1]!;
      return null;
    })
    .filter((item): item is string => item !== null);
}

function readyStepTitles(doneItems: string[]): string[] {
  return doneItems.filter(
    (item) =>
      !item.includes("uploaded") &&
      !item.includes("approval") &&
      !item.includes("Publication") &&
      !item.includes("draft ready") &&
      !item.includes("approved") &&
      !item.includes("published"),
  );
}

export interface BriefingNarrative {
  statusLine: string;
  readyLine: string | null;
  attentionLine: string | null;
}

export function buildBriefingNarrative(
  intelligence: CampaignIntelligence,
): BriefingNarrative {
  if (intelligence.readinessLabel === "calendar_only") {
    return {
      statusLine: intelligence.summary,
      readyLine: null,
      attentionLine: null,
    };
  }

  const readyNames = [
    ...readyChannelNames(intelligence.doneItems),
    ...readyStepTitles(intelligence.doneItems),
  ];

  const stillNeeded = intelligence.missingPieces;

  let readyLine: string | null = null;
  if (readyNames.length > 0) {
    const subject =
      readyNames.length === 1 ? readyNames[0]! : formatList(readyNames);
    const verb = readyNames.length === 1 ? "is" : "are";
    readyLine =
      readyNames.length === 1 && !subject.startsWith("The")
        ? `The ${subject} ${verb} ready.`
        : `${subject} ${verb} ready.`;
  }

  let attentionLine: string | null = null;
  if (stillNeeded.length > 0) {
    attentionLine = `${formatList(stillNeeded)} still need${stillNeeded.length === 1 ? "s" : ""} attention.`;
  } else if (intelligence.needsAttention.length > 0) {
    attentionLine = `${formatList(intelligence.needsAttention.slice(0, 3))} need${intelligence.needsAttention.length === 1 ? "s" : ""} your attention.`;
  }

  return {
    statusLine: intelligence.summary,
    readyLine,
    attentionLine,
  };
}
