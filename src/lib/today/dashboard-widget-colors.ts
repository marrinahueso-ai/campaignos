import type { CSSProperties } from "react";

/** Widgets that support a custom card background in Edit mode. */
export const DASHBOARD_COLORABLE_WIDGET_IDS = [
  "attention",
  "waiting_me",
  "good_news",
  "this_week",
  "approvals",
  "tasks_week",
  "volunteers",
  "insights",
] as const;

export type DashboardColorableWidgetId =
  (typeof DASHBOARD_COLORABLE_WIDGET_IDS)[number];

const COLORABLE = new Set<string>(DASHBOARD_COLORABLE_WIDGET_IDS);

/** Curated swatches that fit the cream / sunburst palette. */
export const DASHBOARD_CARD_COLOR_PRESETS = [
  { label: "Default", value: null },
  { label: "Cream", value: "#ebe4d9" },
  { label: "Sand", value: "#e8dfd2" },
  { label: "Sage soft", value: "#e8eee9" },
  { label: "Mustard soft", value: "#f5ecd8" },
  { label: "Terracotta soft", value: "#f6e8e4" },
  { label: "Navy soft", value: "#e8ebf0" },
  { label: "Sage", value: "#6b8171" },
  { label: "Mustard", value: "#cc9c48" },
  { label: "Terracotta", value: "#d06650" },
  { label: "Navy", value: "#18243b" },
  { label: "Espresso", value: "#2a2622" },
] as const;

export function dashboardWidgetSupportsColor(
  id: string,
): id is DashboardColorableWidgetId {
  return COLORABLE.has(id);
}

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function normalizeDashboardCardColor(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function relativeLuminance(hex: string): number {
  const normalized = normalizeDashboardCardColor(hex);
  if (!normalized) return 1;
  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const toLinear = (channel: number) =>
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function isDarkDashboardCardColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.45;
}

export interface DashboardCardToneVars {
  background: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  /** Inline style map for a card root. */
  style: CSSProperties;
}

/** Build readable text/surface tokens for a chosen card background. */
export function getDashboardCardTone(hex: string): DashboardCardToneVars | null {
  const background = normalizeDashboardCardColor(hex);
  if (!background) return null;

  const dark = isDarkDashboardCardColor(background);
  const text = dark ? "#fffcf7" : "#2a2622";
  const muted = dark ? "rgba(255, 252, 247, 0.78)" : "#5c554c";
  const card = dark ? "rgba(255, 252, 247, 0.12)" : "rgba(255, 252, 247, 0.72)";
  const border = dark ? "rgba(255, 252, 247, 0.18)" : "rgba(42, 38, 34, 0.08)";

  return {
    background,
    text,
    muted,
    card,
    border,
    style: {
      backgroundColor: background,
      color: text,
      // Override theme tokens so existing text-cos-* / bg-cos-* utilities adapt.
      ["--cos-bg-alt" as string]: background,
      ["--cos-text" as string]: text,
      ["--cos-muted" as string]: muted,
      ["--cos-card" as string]: card,
      ["--cos-border" as string]: border,
      ["--cos-primary" as string]: text,
    } as CSSProperties,
  };
}
