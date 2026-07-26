export function formatInsightsNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }

  if (value >= 1_000) {
    // Mockup KPI strip uses lowercase compact units (e.g. 12.4k).
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
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

function formatInsightsSyncTimestamp(lastSyncAt: string): string {
  const date = new Date(lastSyncAt);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Native title / tooltip for Refresh — e.g. “Last Sync: Jul 26, 11:40 AM”. */
export function formatLastSyncTitle(lastSyncAt: string | null): string {
  if (!lastSyncAt) {
    return "Last Sync: Never";
  }
  const date = new Date(lastSyncAt);
  if (Number.isNaN(date.getTime())) {
    return "Last Sync: —";
  }
  return `Last Sync: ${formatInsightsSyncTimestamp(lastSyncAt)}`;
}

/** Sync timestamp for event Insights footer — mockup: “Jul 26, 11:40 AM”. */
export function formatEventInsightsSyncLabel(
  lastSyncAt: string | null,
): string {
  if (!lastSyncAt) {
    return "Not synced yet";
  }
  const date = new Date(lastSyncAt);
  if (Number.isNaN(date.getTime())) {
    return "Not synced yet";
  }
  return formatInsightsSyncTimestamp(lastSyncAt);
}
