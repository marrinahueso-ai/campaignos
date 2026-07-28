"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import "./warm-breath.css";

type WarmBreathFrameProps = {
  /** When false, children render without the breath chrome. */
  active: boolean;
  children: ReactNode;
  className?: string;
  /** Optional accessible label while generating. */
  label?: string;
};

/**
 * Soft scale + cream/amber/teal gradient wash around artwork while AI generates.
 * Honors prefers-reduced-motion (static wash, no scale).
 */
export function WarmBreathFrame({
  active,
  children,
  className,
  label = "Generating artwork",
}: WarmBreathFrameProps) {
  if (!active) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("warm-breath", className)}
      aria-busy="true"
      aria-label={label}
    >
      <div className="warm-breath__aura" aria-hidden="true" />
      <div className="warm-breath__content">{children}</div>
    </div>
  );
}
