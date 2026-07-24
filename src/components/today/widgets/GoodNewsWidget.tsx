import Link from "next/link";
import { PartyPopper, Star } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import type { TodayGoodNews } from "@/types/today";

interface GoodNewsWidgetProps {
  goodNews: TodayGoodNews;
}

export function GoodNewsWidget({ goodNews }: GoodNewsWidgetProps) {
  const highlight = goodNews.items[0] ?? null;

  return (
    <DashboardWidgetCard icon={Star} title="Good news">
      {highlight ? (
        <div className="flex h-full flex-col items-start gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cos-card text-cos-brand-sage ring-1 ring-black/[0.04]">
            <PartyPopper className="h-5 w-5" aria-hidden />
          </span>
          {highlight.href ? (
            <Link href={highlight.href} className="space-y-1 hover:opacity-90">
              <p className="text-sm font-semibold text-cos-text">
                {highlight.message}
              </p>
              <p className="text-xs text-cos-muted">{highlight.timestampLabel}</p>
            </Link>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-cos-text">
                {highlight.message}
              </p>
              <p className="text-xs text-cos-muted">{highlight.timestampLabel}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col items-start gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cos-card text-cos-brand-sage ring-1 ring-black/[0.04]">
            <PartyPopper className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-cos-muted">
            {goodNews.fallbackMessage}
          </p>
        </div>
      )}
    </DashboardWidgetCard>
  );
}
