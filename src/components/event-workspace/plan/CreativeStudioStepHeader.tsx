"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CreativeStudioStepHeaderProps {
  eventId: string;
  title: string;
  description?: string;
  backHref?: string;
  eyebrow?: string;
}

export function CreativeStudioStepHeader({
  eventId,
  title,
  description,
  backHref,
  eyebrow = "Creative Studio",
}: CreativeStudioStepHeaderProps) {
  const resolvedBackHref = backHref ?? `/events/${eventId}`;

  return (
    <div className="space-y-5">
      <Link
        href={resolvedBackHref}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to campaign
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="studio-eyebrow">{eyebrow}</p>
          <h1 className="font-display mt-1.5 text-3xl text-cos-text sm:text-[2.25rem] sm:leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">{description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            href={`/events/${eventId}`}
            variant="secondary"
            size="sm"
            className="h-9 px-4"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View campaign
          </Button>
        </div>
      </div>
    </div>
  );
}
