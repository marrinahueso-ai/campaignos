"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface WorkspaceSectionProps {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function WorkspaceSection({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: WorkspaceSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-8 border-t border-cos-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`${id}-content`}
        className="flex w-full items-start justify-between gap-4 rounded-lg py-5 text-left transition-colors duration-200 hover:bg-cos-bg/50"
      >
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-cos-text">{title}</h2>
          {description && (
            <p className="text-sm leading-relaxed text-cos-muted">{description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 text-cos-muted transition-transform duration-300 ease-in-out",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div id={`${id}-content`} className="space-y-6 pb-7 pt-1">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
