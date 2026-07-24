import { normalizeDashboardCardColor } from "../today/dashboard-widget-colors.ts";

export type ApprovalsSummaryCardKey =
  | "assigned_to_me"
  | "changes_requested"
  | "in_queue"
  | "scheduled"
  | "published";

export const APPROVALS_SUMMARY_CARDS: {
  key: ApprovalsSummaryCardKey;
  countKey:
    | "assignedToMe"
    | "changesRequested"
    | "inQueue"
    | "scheduled"
    | "published";
  label: string;
  description: string;
}[] = [
  {
    key: "assigned_to_me",
    countKey: "assignedToMe",
    label: "Assigned to Me",
    description: "Needs your approval",
  },
  {
    key: "changes_requested",
    countKey: "changesRequested",
    label: "Changes Requested",
    description: "Returned for edits",
  },
  {
    key: "in_queue",
    countKey: "inQueue",
    label: "In Queue",
    description: "Waiting to be assigned",
  },
  {
    key: "scheduled",
    countKey: "scheduled",
    label: "Scheduled",
    description: "Scheduled to publish",
  },
  {
    key: "published",
    countKey: "published",
    label: "Published",
    description: "Live and published",
  },
];

export type ApprovalsCardColors = Partial<
  Record<ApprovalsSummaryCardKey, string>
>;

export interface ApprovalsLayout {
  version: 1;
  order: ApprovalsSummaryCardKey[];
  colors?: ApprovalsCardColors;
}

const KNOWN_KEYS = new Set<ApprovalsSummaryCardKey>(
  APPROVALS_SUMMARY_CARDS.map((card) => card.key),
);

export function defaultApprovalsLayout(): ApprovalsLayout {
  return {
    version: 1,
    order: APPROVALS_SUMMARY_CARDS.map((card) => card.key),
  };
}

function isSummaryKey(value: unknown): value is ApprovalsSummaryCardKey {
  return (
    typeof value === "string" &&
    KNOWN_KEYS.has(value as ApprovalsSummaryCardKey)
  );
}

export function normalizeApprovalsLayout(raw: unknown): ApprovalsLayout {
  const fallback = defaultApprovalsLayout();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const fromOrder = Array.isArray(record.order)
    ? (record.order as unknown[]).filter(isSummaryKey)
    : [];

  const seen = new Set<ApprovalsSummaryCardKey>();
  const order: ApprovalsSummaryCardKey[] = [];
  for (const key of fromOrder) {
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of fallback.order) {
    if (seen.has(key)) continue;
    order.push(key);
  }

  const colors: ApprovalsCardColors = {};
  if (
    record.colors &&
    typeof record.colors === "object" &&
    !Array.isArray(record.colors)
  ) {
    for (const [key, value] of Object.entries(
      record.colors as Record<string, unknown>,
    )) {
      if (!isSummaryKey(key)) continue;
      const hex = normalizeDashboardCardColor(value);
      if (!hex) continue;
      colors[key] = hex;
    }
  }

  const next: ApprovalsLayout = { version: 1, order };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}

export function reorderApprovalsCard(
  layout: ApprovalsLayout,
  activeKey: ApprovalsSummaryCardKey,
  overKey: ApprovalsSummaryCardKey,
): ApprovalsLayout {
  if (activeKey === overKey) return layout;
  const order = [...layout.order];
  const from = order.indexOf(activeKey);
  const to = order.indexOf(overKey);
  if (from < 0 || to < 0) return layout;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item!);
  return { ...layout, order };
}

export function setApprovalsCardColor(
  layout: ApprovalsLayout,
  key: ApprovalsSummaryCardKey,
  color: string | null,
): ApprovalsLayout {
  const colors: ApprovalsCardColors = { ...(layout.colors ?? {}) };
  const hex = color ? normalizeDashboardCardColor(color) : null;
  if (hex) {
    colors[key] = hex;
  } else {
    delete colors[key];
  }
  const next: ApprovalsLayout = {
    version: 1,
    order: layout.order,
  };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}
