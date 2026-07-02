"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface LifecycleSectionCardProps {
  id?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  count?: number;
  collapsedSummary?: string | null;
}

export function LifecycleSectionCard({
  id,
  title,
  description,
  action,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  count,
  collapsedSummary,
}: LifecycleSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasItems = (count ?? 0) > 0;

  return (
    <Card id={id} padding="none" className={cn("scroll-mt-8 flex flex-col", className)}>
      <CardHeader className="mb-0 border-b border-cos-border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {collapsible ? (
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-start gap-2 text-left"
                aria-expanded={open}
              >
                {open ? (
                  <ChevronDown className="mt-1.5 h-4 w-4 shrink-0 text-cos-muted" />
                ) : (
                  <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-cos-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    {typeof count === "number" && (
                      <span className="rounded-full bg-cos-bg px-2 py-0.5 text-xs font-medium tabular-nums text-cos-muted">
                        {count}
                      </span>
                    )}
                  </span>
                  <CardDescription className="mt-1.5">{description}</CardDescription>
                  {!open && collapsedSummary && (
                    <p className="mt-2 text-xs text-cos-muted">{collapsedSummary}</p>
                  )}
                </span>
              </button>
            ) : (
              <>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription className="mt-1.5">{description}</CardDescription>
              </>
            )}
          </div>
          {action}
        </div>
      </CardHeader>
      {(!collapsible || open) && <div className="flex-1 px-6 py-5">{children}</div>}
      {collapsible && !open && hasItems && (
        <div className="border-t border-cos-border px-6 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-cos-text underline-offset-2 hover:underline"
          >
            Expand to review
          </button>
        </div>
      )}
    </Card>
  );
}
