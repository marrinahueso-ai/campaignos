"use client";

import { getMarketingDemo } from "@/marketing/demo-generator/demoRegistry";

interface MarketingPublicDemoProps {
  demoId: string;
  className?: string;
}

/**
 * Public Features mount for a registered marketing demo.
 * Lazy-loads via the Demo Generator registry — no harness controls.
 */
export function MarketingPublicDemo({
  demoId,
  className,
}: MarketingPublicDemoProps) {
  const entry = getMarketingDemo(demoId);
  if (!entry) {
    return (
      <div
        className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-cos-border bg-cos-card text-sm text-cos-muted sm:min-h-[28rem]"
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
      className={className ?? "h-[28rem] w-full sm:h-[30rem] lg:h-[32rem]"}
    />
  );
}
