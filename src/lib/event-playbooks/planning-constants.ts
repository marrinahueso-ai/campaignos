import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  MessageSquare,
  MessagesSquare,
  Users,
} from "lucide-react";

export type PlanningLinkStatus = "open" | "filled";

export interface PlanningQuickLinkValue {
  url: string;
  status: PlanningLinkStatus;
}

export type PlanningQuickLinkKey =
  | "volunteer_signup"
  | "event_budget"
  | "marketing_materials"
  | "vendor_list"
  | "communication_plan";

export interface PlanningQuickLinkDefinition {
  key: PlanningQuickLinkKey;
  label: string;
  icon: LucideIcon;
}

export const PLANNING_QUICK_LINK_DEFINITIONS: PlanningQuickLinkDefinition[] = [
  { key: "volunteer_signup", label: "Volunteer Signup", icon: Users },
  { key: "event_budget", label: "Event Budget", icon: ClipboardList },
  { key: "marketing_materials", label: "Marketing Materials", icon: MessageSquare },
  { key: "vendor_list", label: "Vendor List", icon: Calendar },
  { key: "communication_plan", label: "Communication Plan", icon: MessagesSquare },
];

export interface PlanningVendorEntry {
  id: string;
  name: string;
  notes: string;
  status: PlanningLinkStatus;
}

export type PlanningQuickLinksMap = Partial<
  Record<PlanningQuickLinkKey, PlanningQuickLinkValue>
>;

export function mergePlanningQuickLinks(
  saved: PlanningQuickLinksMap | null | undefined,
): Record<PlanningQuickLinkKey, PlanningQuickLinkValue> {
  const base = Object.fromEntries(
    PLANNING_QUICK_LINK_DEFINITIONS.map(({ key }) => [
      key,
      { url: "", status: "open" as PlanningLinkStatus },
    ]),
  ) as Record<PlanningQuickLinkKey, PlanningQuickLinkValue>;

  if (!saved) {
    return base;
  }

  for (const def of PLANNING_QUICK_LINK_DEFINITIONS) {
    const entry = saved[def.key];
    if (entry) {
      base[def.key] = {
        url: entry.url ?? "",
        status: entry.status === "filled" ? "filled" : "open",
      };
    }
  }

  return base;
}

export function parsePlanningVendors(raw: unknown): PlanningVendorEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) {
        return null;
      }
      return {
        id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
        name,
        notes: typeof row.notes === "string" ? row.notes : "",
        status: row.status === "filled" ? "filled" : "open",
      } satisfies PlanningVendorEntry;
    })
    .filter((entry): entry is PlanningVendorEntry => entry !== null);
}

export function parsePlanningQuickLinks(raw: unknown): PlanningQuickLinksMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const result: PlanningQuickLinksMap = {};
  for (const def of PLANNING_QUICK_LINK_DEFINITIONS) {
    const entry = (raw as Record<string, unknown>)[def.key];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const row = entry as Record<string, unknown>;
    result[def.key] = {
      url: typeof row.url === "string" ? row.url : "",
      status: row.status === "filled" ? "filled" : "open",
    };
  }
  return result;
}
