"use client";

import dynamic from "next/dynamic";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const RalliAiAssistantDialog = dynamic(
  () =>
    import("@/components/layout/RalliAiAssistantDialog").then(
      (mod) => mod.RalliAiAssistantDialog,
    ),
  { ssr: false },
);

/** Top-rail ? — opens Ask Ralli (not sidebar-pinned; Help Center is browse-only). */
export function HeaderAskRalliButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Ask Ralli"
        title="Ask Ralli"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-9 items-center justify-center border border-transparent transition-colors",
          open
            ? "border-cos-border bg-cos-dark text-[#f6f2eb]"
            : "text-cos-muted hover:border-cos-border hover:bg-cos-bg hover:text-cos-text",
        )}
      >
        <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {open ? <RalliAiAssistantDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
