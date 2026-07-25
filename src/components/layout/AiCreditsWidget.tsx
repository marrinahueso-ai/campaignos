import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";

interface AiCreditsWidgetProps {
  data?: AiCreditsWidgetData | null;
  compact?: boolean;
}

export function AiCreditsWidget({
  data = null,
  compact = false,
}: AiCreditsWidgetProps) {
  if (!data) {
    if (compact) {
      return (
        <div
          className="flex h-10 w-10 items-center justify-center border border-cos-border bg-cos-bg/60"
          title="AI credits unavailable"
          aria-label="AI credits unavailable"
        >
          <span className="text-[10px] font-semibold text-cos-muted">—</span>
        </div>
      );
    }
    return (
      <div className="border border-cos-border bg-cos-bg/40 p-4">
        <p className="cos-section-title">AI credits</p>
        <p className="mt-2 text-sm text-cos-muted">Loading balance…</p>
      </div>
    );
  }

  if (data.unlimited) {
    if (compact) {
      return (
        <div
          className="flex h-10 w-10 items-center justify-center border border-cos-border bg-cos-bg/60"
          title="AI credits: unlimited"
          aria-label="AI credits unlimited"
        >
          <span className="text-[10px] font-semibold text-cos-text">∞</span>
        </div>
      );
    }
    return (
      <div className="border border-cos-border bg-cos-bg/40 p-4">
        <p className="cos-section-title">AI credits</p>
        <p className="mt-2 text-sm font-medium text-cos-text">Unlimited</p>
        <p className="mt-2 text-xs text-cos-muted">
          Founding / exempt — usage is logged, not capped.
        </p>
        <Link
          href="/settings/billing-plan"
          className="mt-2 inline-block text-xs font-medium text-cos-text underline-offset-2 hover:underline"
        >
          Billing & plan
        </Link>
      </div>
    );
  }

  const { used, allowance, reserveBalance, softWarn, exhausted, resetLabel } =
    data;
  const percent =
    allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0;
  const remaining = Math.max(0, allowance - used);
  const alert = exhausted || softWarn;

  if (compact) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center border bg-cos-bg/60",
          alert
            ? "border-cos-error text-cos-error-text"
            : "border-cos-border text-cos-text",
        )}
        title={
          exhausted
            ? "AI credits exhausted — upgrade or buy Reserve"
            : `AI credits: ${remaining} left of ${allowance}${
                reserveBalance > 0 ? ` · ${reserveBalance} reserve` : ""
              }`
        }
        aria-label={
          exhausted
            ? "AI credits exhausted. Upgrade or buy AI Reserve."
            : `AI credits: ${used} of ${allowance} used this month. ${resetLabel}.${
                softWarn ? " Low balance." : ""
              }`
        }
      >
        <span className="text-[10px] font-semibold tabular-nums">
          {exhausted ? "0" : remaining}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border bg-cos-bg/40 p-4",
        alert ? "border-cos-error" : "border-cos-border",
      )}
    >
      <p className="cos-section-title">AI credits</p>
      <p className="mt-2 text-sm font-medium text-cos-text tabular-nums">
        {used} / {allowance} used
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden bg-cos-border/60"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={allowance}
        aria-label={`${used} of ${allowance} AI credits used this month`}
      >
        <div
          className={cn(
            "h-full transition-[width]",
            alert ? "bg-cos-error" : "bg-cos-dark",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {reserveBalance > 0 ? (
        <p className="mt-2 text-xs text-cos-muted tabular-nums">
          + {reserveBalance.toLocaleString()} reserve
        </p>
      ) : null}
      {exhausted ? (
        <p className="mt-2 text-xs font-medium text-cos-error-text">
          Out of credits — AI is paused until you upgrade or buy Reserve
        </p>
      ) : softWarn ? (
        <p className="mt-2 text-xs font-medium text-cos-error-text">
          Running low — {remaining} left this month
        </p>
      ) : (
        <p className="mt-2 text-xs text-cos-muted">{resetLabel}</p>
      )}
      <Link
        href="/settings/billing-plan?tab=plan"
        className="mt-2 inline-block text-xs font-medium text-cos-text underline-offset-2 hover:underline"
      >
        {exhausted ? "Get more credits" : "Billing & plan"}
      </Link>
    </div>
  );
}
