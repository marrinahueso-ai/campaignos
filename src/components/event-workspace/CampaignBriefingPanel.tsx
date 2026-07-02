"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildBriefingNarrative } from "@/lib/campaign-intelligence/briefing-narrative";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import { cn } from "@/lib/utils/cn";

interface CampaignBriefingPanelProps {
  intelligence: CampaignIntelligence;
}

export function CampaignBriefingPanel({
  intelligence,
}: CampaignBriefingPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const narrative = buildBriefingNarrative(intelligence);

  const showCompletion =
    intelligence.readinessLabel !== "calendar_only" &&
    intelligence.completionPercent < 100;

  const hasDetails =
    intelligence.doneItems.length > 0 ||
    intelligence.needsAttention.length > 0 ||
    intelligence.waitingItems.length > 0 ||
    intelligence.overdueItems.length > 0;

  return (
    <div
      id="campaign-briefing"
      className="scroll-mt-8 rounded-3xl bg-cos-card p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-cos-text">Campaign briefing</h2>
        {showCompletion && (
          <p className="text-sm text-cos-muted">
            <span className="font-medium text-cos-text">
              {intelligence.completionPercent}%
            </span>{" "}
            complete
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-base leading-relaxed text-cos-text">
          {narrative.statusLine}
        </p>
        {narrative.readyLine && (
          <p className="text-sm leading-relaxed text-cos-muted">
            {narrative.readyLine}
          </p>
        )}
        {narrative.attentionLine && (
          <p className="text-sm leading-relaxed text-cos-muted">
            {narrative.attentionLine}
          </p>
        )}
      </div>

      {intelligence.nextAction && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-cos-border pt-5">
          <p className="text-sm text-cos-text">
            <span className="font-medium">Next:</span>{" "}
            {intelligence.nextAction.description}
          </p>
          <Button href={intelligence.nextAction.href} size="sm">
            Continue
          </Button>
        </div>
      )}

      {hasDetails && (
        <div className="mt-5 border-t border-cos-border pt-4">
          <button
            type="button"
            onClick={() => setDetailsOpen((value) => !value)}
            aria-expanded={detailsOpen}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            {detailsOpen ? "Hide details" : "Show details"}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                detailsOpen && "rotate-180",
              )}
            />
          </button>

          {detailsOpen && (
            <div className="mt-5 space-y-5">
              {intelligence.doneItems.length > 0 && (
                <BriefingDetailGroup title="What's done">
                  {intelligence.doneItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-cos-muted"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cos-success" />
                      <span>{item}</span>
                    </li>
                  ))}
                </BriefingDetailGroup>
              )}

              {intelligence.needsAttention.length > 0 && (
                <BriefingDetailGroup title="Needs your attention">
                  {intelligence.needsAttention.map((item) => (
                    <li key={item} className="text-sm text-cos-muted">
                      {item}
                    </li>
                  ))}
                </BriefingDetailGroup>
              )}

              {intelligence.waitingItems.length > 0 && (
                <BriefingDetailGroup title="Waiting on">
                  {intelligence.waitingItems.map((item) => (
                    <li key={item} className="text-sm text-cos-muted">
                      {item}
                    </li>
                  ))}
                </BriefingDetailGroup>
              )}

              {intelligence.overdueItems.length > 0 && (
                <BriefingDetailGroup title="Past due">
                  {intelligence.overdueItems.map((item) => (
                    <li key={item} className="text-sm text-cos-muted">
                      {item}
                    </li>
                  ))}
                </BriefingDetailGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BriefingDetailGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-medium text-cos-text">{title}</h3>
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </section>
  );
}
