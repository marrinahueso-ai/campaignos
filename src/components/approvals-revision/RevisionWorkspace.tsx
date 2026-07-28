"use client";

import "@/components/approvals-revision/revision-workspace.css";
import { ApproverRequestCard } from "@/components/approvals-revision/ApproverRequestCard";
import { CreatorRevisionCard } from "@/components/approvals-revision/CreatorRevisionCard";
import type { RevisionWorkspaceModel } from "@/components/approvals-revision/types";

export function RevisionWorkspace({
  model,
}: {
  model: RevisionWorkspaceModel;
}) {
  if (model.mode === "approver") {
    return <ApproverRequestCard model={model} />;
  }
  return <CreatorRevisionCard model={model} />;
}

export type { RevisionWorkspaceModel } from "@/components/approvals-revision/types";
