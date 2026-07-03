"use client";

interface OpenFilledBadgeProps {
  status: "open" | "filled";
  onToggle?: () => void;
  readOnly?: boolean;
}

export function OpenFilledBadge({ status, onToggle, readOnly }: OpenFilledBadgeProps) {
  const label = status === "filled" ? "Filled" : "Open";
  const className =
    status === "filled"
      ? "bg-cos-success-soft text-cos-success-text"
      : "bg-cos-warning-soft text-cos-warning-text";

  if (readOnly || !onToggle) {
    return (
      <span
        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
      >
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${className}`}
    >
      {label}
    </button>
  );
}
