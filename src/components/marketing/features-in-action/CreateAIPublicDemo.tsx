"use client";

import { MarketingPublicDemo } from "./MarketingPublicDemo";

/** @deprecated Prefer MarketingPublicDemo with demoId="create-ai". */
export function CreateAIPublicDemo({ className }: { className?: string }) {
  return <MarketingPublicDemo demoId="create-ai" className={className} />;
}
