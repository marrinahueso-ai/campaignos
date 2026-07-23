import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { InsightsSectionCard } from "@/components/insights/InsightsSectionCard";
import { PlatformIcon } from "@/components/insights/PlatformIcon";
import { formatChangePercent, formatInsightsNumber } from "@/lib/insights/format";
import type { InsightsPlatformTotals } from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

interface PlatformComparisonProps {
  platforms: InsightsPlatformTotals[];
}

export function PlatformComparison({ platforms }: PlatformComparisonProps) {
  return (
    <InsightsSectionCard title="Platforms">
      <div className="space-y-3">
        {platforms.map((entry) => {
          const change = formatChangePercent(entry.reachChangePercent);
          const positive = (entry.reachChangePercent ?? 0) >= 0;

          return (
            <div
              key={entry.platform}
              className="rounded-lg border border-cos-border bg-cos-bg/50 px-3 py-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <PlatformIcon
                  platform={entry.platform}
                  className="h-6 w-6 rounded-full text-[9px]"
                />
                <span className="text-sm font-medium capitalize text-cos-text">
                  {entry.platform}
                </span>
              </div>

              {entry.unavailableReason ? (
                <p className="text-xs text-cos-muted">{entry.unavailableReason}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-cos-muted">Views</p>
                    <p className="font-display text-xl text-cos-text">
                      {formatInsightsNumber(entry.views)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-cos-muted">Reach</p>
                    <p className="font-display text-xl text-cos-text">
                      {formatInsightsNumber(entry.reach)}
                    </p>
                    {change ? (
                      <div className="mt-0.5 flex items-center gap-0.5 text-[11px]">
                        {positive ? (
                          <ArrowUpRight className="h-3 w-3 text-cos-success" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-cos-error" />
                        )}
                        <span
                          className={cn(
                            positive
                              ? "text-cos-success-text"
                              : "text-cos-error-text",
                          )}
                        >
                          {change}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[11px] text-cos-muted">Interactions</p>
                    <p className="font-display text-xl text-cos-text">
                      {formatInsightsNumber(entry.engagement)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </InsightsSectionCard>
  );
}
