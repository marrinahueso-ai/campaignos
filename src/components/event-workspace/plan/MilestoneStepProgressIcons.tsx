"use client";

import Image from "next/image";
import type { MilestoneStepProgress } from "@/components/event-workspace/plan/milestone-planning-utils";
import { cn } from "@/lib/utils/cn";

const STEP_ICONS = [
  { key: "artwork", label: "Artwork", src: "/milestone-progress/artwork.png" },
  { key: "captions", label: "Captions", src: "/milestone-progress/captions.png" },
  { key: "email", label: "Email", src: "/milestone-progress/email.png" },
  { key: "newsletter", label: "Newsletter", src: "/milestone-progress/newsletter.png" },
] as const;

interface MilestoneStepProgressIconsProps {
  progress: MilestoneStepProgress;
  className?: string;
}

export function MilestoneStepProgressIcons({
  progress,
  className,
}: MilestoneStepProgressIconsProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1", className)}
      aria-label="Milestone step progress"
    >
      {STEP_ICONS.map((step) => {
        const complete = progress[step.key];

        return (
          <span
            key={step.key}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center",
              !complete && "opacity-35 grayscale",
            )}
            title={step.label}
            aria-label={`${step.label}: ${complete ? "complete" : "incomplete"}`}
          >
            <Image
              src={step.src}
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px] object-contain"
              aria-hidden
            />
          </span>
        );
      })}
    </span>
  );
}
