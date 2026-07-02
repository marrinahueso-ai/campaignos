"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { CREATE_WORKFLOW_ACTIONS } from "@/lib/creative-assets/constants";
import type { CreateWorkflowId } from "@/lib/creative-assets/types";
import { cn } from "@/lib/utils/cn";

function workflowHref(id: CreateWorkflowId, campaign: string | null): string | null {
  if (id === "ai_artwork") {
    const params = new URLSearchParams();
    if (campaign) params.set("campaign", campaign);
    params.set("tab", "artwork");
    return `/creative-studio?${params.toString()}`;
  }
  return null;
}

export function CreateActionGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaign = searchParams.get("campaign");

  return (
    <section id="create" className="scroll-mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-cos-primary" />
        <h2 className="text-lg font-semibold text-cos-text">Create</h2>
      </div>
      <p className="text-sm text-cos-muted">
        Launch creative workflows. Some actions are placeholders until future engines ship.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CREATE_WORKFLOW_ACTIONS.map((action) => {
          const href = workflowHref(action.id, campaign);
          const enabled = !action.placeholder || href !== null;

          return (
            <button
              key={action.id}
              type="button"
              disabled={!enabled}
              onClick={() => {
                if (href) router.push(href);
              }}
              className={cn(
                "rounded-2xl border border-cos-border bg-cos-card p-5 text-left shadow-sm transition-colors",
                enabled
                  ? "hover:border-cos-primary hover:bg-cos-bg/40"
                  : "cursor-not-allowed opacity-80",
              )}
            >
              <p className="text-sm font-medium text-cos-text">{action.label}</p>
              <p className="mt-1 text-xs text-cos-muted">{action.description}</p>
              {action.placeholder && (
                <span className="mt-3 inline-block rounded-full bg-cos-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cos-muted">
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
