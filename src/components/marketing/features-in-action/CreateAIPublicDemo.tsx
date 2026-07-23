"use client";

import { getMarketingDemo } from "@/marketing/demo-generator/demoRegistry";

/**
 * Public Features page mount for the Create with AI demo.
 * Uses the registry lazy loader — no harness controls.
 */
export function CreateAIPublicDemo({ className }: { className?: string }) {
  const entry = getMarketingDemo("create-ai");
  if (!entry) {
    return (
      <div
        className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-cos-border bg-cos-card text-sm text-cos-muted"
        role="status"
      >
        Demo unavailable
      </div>
    );
  }

  const Demo = entry.Demo;
  return (
    <Demo
      showControls={false}
      className={
        className ??
        "overflow-hidden rounded-2xl border border-cos-border bg-cos-bg shadow-sm"
      }
    />
  );
}
