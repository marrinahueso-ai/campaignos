"use client";

import { RalliAiAssistantWidget } from "@/components/layout/RalliAiAssistantWidget";

/** Demoted entry for Ask Ralli — Help Center only (not sidebar-pinned). */
export function HelpAskRalli() {
  return (
    <section className="border border-cos-border bg-cos-card px-5 py-5 sm:px-6">
      <h2 className="font-display text-xl text-cos-text">Ask Ralli</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-cos-muted">
        Prefer chat? Ask for today’s priorities, what’s next on an event, or a
        draft reminder — after you’ve checked the how-tos above.
      </p>
      <div className="mt-4 max-w-md">
        <RalliAiAssistantWidget />
      </div>
    </section>
  );
}
