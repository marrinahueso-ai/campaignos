export function formatInsightsNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(Math.round(value));
}

export function formatChangePercent(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value * 10) / 10;
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded}%`;
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Absolute + relative sync label for event Insights footer. */
export function formatEventInsightsSyncLabel(
  lastSyncAt: string | null,
  now = Date.now(),
): string {
  if (!lastSyncAt) {
    return "Not synced yet";
  }
  const absolute = new Date(lastSyncAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const relative = formatRelativeTime(lastSyncAt, now);
  return relative ? `${absolute} (${relative})` : absolute;
}
