interface AiCreditsWidgetProps {
  used?: number;
  total?: number;
  resetLabel?: string;
  compact?: boolean;
}

export function AiCreditsWidget({
  used = 18,
  total = 50,
  resetLabel = "Reset on Aug 1",
  compact = false,
}: AiCreditsWidgetProps) {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  if (compact) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center border border-cos-border bg-cos-bg/60"
        title={`AI credits: ${used} / ${total} used`}
        aria-label={`AI credits: ${used} of ${total} used. ${resetLabel}.`}
      >
        <span className="text-[10px] font-semibold tabular-nums text-cos-text">
          {used}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-cos-border bg-cos-bg/40 p-4">
      <p className="cos-section-title">AI credits</p>
      <p className="mt-2 text-sm font-medium text-cos-text tabular-nums">
        {used} / {total} used
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden bg-cos-border/60"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${used} of ${total} AI credits used`}
      >
        <div
          className="h-full bg-cos-dark transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-cos-muted">{resetLabel}</p>
    </div>
  );
}
