"use client";

import { Pencil } from "lucide-react";
import { ReviewPublishPostCard } from "@/components/event-workspace/review-publish/ReviewPublishPostCard";
import type { ReviewPublishPost } from "@/components/event-workspace/review-publish/build-review-posts";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";

interface ReviewPublishContentPanelProps {
  posts: ReviewPublishPost[];
  onEditCaptionsOrArtwork?: (step: CampaignWorkflowStep) => void;
}

export function ReviewPublishContentPanel({
  posts,
  onEditCaptionsOrArtwork,
}: ReviewPublishContentPanelProps) {
  const postCountLabel = posts.length === 1 ? "1 POST" : `${posts.length} POSTS`;

  return (
    <section className="flex h-full flex-col border border-cos-border bg-cos-card">
      <header className="flex items-center justify-between border-b border-cos-border px-4 py-3.5 sm:px-5">
        <p className="cos-section-title">Content to publish</p>
        <p className="cos-section-title">{postCountLabel}</p>
      </header>

      <div className="flex-1">
        {posts.map((post) => (
          <ReviewPublishPostCard key={post.id} post={post} />
        ))}
      </div>

      <footer className="border-t border-cos-border px-4 py-3.5 sm:px-5">
        <button
          type="button"
          onClick={() => onEditCaptionsOrArtwork?.("schedule")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit captions or artwork
        </button>
      </footer>
    </section>
  );
}
