/**
 * Client-safe shape for the sidebar AI credits widget (no Infinity / server-only).
 */

export type AiCreditsWidgetData = {
  unlimited: boolean;
  used: number;
  allowance: number;
  reserveBalance: number;
  softWarn: boolean;
  /** Period + Reserve are both 0 — AI is hard-blocked. */
  exhausted: boolean;
  resetLabel: string;
  periodYm: string;
};

/** Next calendar month 1st UTC, e.g. period 2026-07 → "Resets Aug 1". */
export function resetLabelForPeriodYm(periodYm: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodYm.trim());
  if (!match) return "Resets monthly";
  const y = Number(match[1]);
  const m = Number(match[2]);
  const next = new Date(Date.UTC(y, m, 1));
  const label = next.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `Resets ${label}`;
}

export function toAiCreditsWidgetData(input: {
  unlimited: boolean;
  used: number;
  allowance: number;
  reserveBalance: number;
  softWarn: boolean;
  exhausted?: boolean;
  periodYm: string;
}): AiCreditsWidgetData {
  const exhausted =
    input.exhausted ??
    (!input.unlimited &&
      Math.max(0, input.allowance - input.used) +
        Math.max(0, input.reserveBalance) <=
        0);
  return {
    unlimited: input.unlimited,
    used: input.used,
    allowance: input.allowance,
    reserveBalance: input.reserveBalance,
    softWarn: exhausted ? false : input.softWarn,
    exhausted,
    periodYm: input.periodYm,
    resetLabel: input.unlimited
      ? "Unlimited"
      : resetLabelForPeriodYm(input.periodYm),
  };
}
