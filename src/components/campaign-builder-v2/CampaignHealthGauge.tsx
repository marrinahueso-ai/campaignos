"use client";

import { cn } from "@/lib/utils/cn";

interface CampaignHealthGaugeProps {
  percent: number;
  className?: string;
}

export function CampaignHealthGauge({ percent, className }: CampaignHealthGaugeProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-[5.5rem] w-[5.5rem]">
        <svg
          viewBox="0 0 88 88"
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-cos-border"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-cos-success transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl text-cos-text">{clamped}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
          Campaign health
        </p>
        <p className="mt-0.5 text-sm text-cos-muted">
          {clamped >= 80
            ? "Looking strong"
            : clamped >= 50
              ? "Needs attention"
              : "Just getting started"}
        </p>
      </div>
    </div>
  );
}
