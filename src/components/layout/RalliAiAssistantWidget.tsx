"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RalliAiAssistantWidgetProps {
  compact?: boolean;
}

function resolveAssistantHref(pathname: string): string {
  const eventMatch = pathname.match(/^\/events\/([^/]+)$/);
  if (eventMatch) {
    return `/events/${eventMatch[1]}#ai-insights`;
  }
  return "/settings/ai-brain";
}

export function RalliAiAssistantWidget({
  compact = false,
}: RalliAiAssistantWidgetProps) {
  const pathname = usePathname();
  const href = resolveAssistantHref(pathname);

  if (compact) {
    return (
      <Link
        href={href}
        title="Ralli AI Assistant"
        aria-label="Ask Ralli AI"
        className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-cos-border bg-cos-bg/60 transition-colors hover:bg-cos-bg"
      >
        <Sparkles className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
      </Link>
    );
  }

  return (
    <div className="rounded-[12px] border border-cos-border bg-cos-card p-4 shadow-[0_1px_2px_rgba(42,38,34,0.04)]">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-cos-accent" strokeWidth={1.5} />
        <h3 className="font-display text-base text-cos-text">Ralli AI Assistant</h3>
        <span className="rounded-full bg-cos-dark px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
          New
        </span>
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-cos-muted">
        Ask anything. Get ideas, draft captions, build content, and more.
      </p>

      <Link
        href={href}
        className={cn(
          "mt-4 flex w-full items-center justify-center rounded-[10px] border border-cos-border",
          "bg-cos-bg-alt px-4 py-2.5 text-sm font-semibold text-cos-text transition-colors hover:bg-cos-bg",
        )}
      >
        Ask Ralli AI →
      </Link>
    </div>
  );
}
