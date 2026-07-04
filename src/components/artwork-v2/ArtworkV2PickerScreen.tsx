"use client";

import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { downloadArtworkImage } from "@/lib/artwork-v2/download";
import {
  groupArtworkPhasesByMilestone,
  type ArtworkPhaseWorkflowItem,
} from "@/lib/artwork-v2/campaign-phases";
import type { MilestoneArtworkStatus } from "@/lib/artwork-v2/batch-generate";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import { milestoneAccordionCardProps } from "@/lib/utils/milestone-accordion";
import { cn } from "@/lib/utils/cn";

export type ArtworkV2PickerEntry = ArtworkWorkflowItem & {
  isApproved: boolean;
  downloadUrl: string | null;
  downloadFilename: string;
};

interface ArtworkV2PickerScreenProps {
  items: ArtworkV2PickerEntry[];
  isPhaseWorkflow?: boolean;
  defaultExpandedDays?: number[];
  onSelect: (item: ArtworkWorkflowItem) => void;
  onSelectMilestone?: (relativeDay: number) => void;
  showGenerateRemaining?: boolean;
  onGenerateRemaining?: () => void;
  getMilestoneStatus?: (relativeDay: number) => MilestoneArtworkStatus;
}

function isPhaseEntry(item: ArtworkV2PickerEntry): item is ArtworkV2PickerEntry & ArtworkPhaseWorkflowItem {
  return typeof item.relativeDay === "number" && Boolean(item.metaPlacement);
}

function milestoneProgress(formats: ArtworkV2PickerEntry[]): {
  approved: number;
  total: number;
  complete: boolean;
} {
  const approved = formats.filter((format) => format.isApproved).length;
  return {
    approved,
    total: formats.length,
    complete: approved === formats.length,
  };
}

function milestoneStatusLabel(status: MilestoneArtworkStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "ready_for_review":
      return "Ready for review";
    case "in_progress":
      return "In progress";
    default:
      return "Not started";
  }
}

function milestoneStatusDescription(
  status: MilestoneArtworkStatus,
  progress: ReturnType<typeof milestoneProgress>,
): string {
  if (status === "complete") {
    return "Feed (1:1) + Story (9:16) ready";
  }
  if (status === "ready_for_review") {
    return "Generated versions waiting for your review";
  }
  if (status === "in_progress") {
    return progress.approved > 0 ? "Story version in progress" : "Feed + Story · one creation flow";
  }
  return "Feed + Story · one creation flow";
}

export function ArtworkV2PickerScreen({
  items,
  isPhaseWorkflow = false,
  defaultExpandedDays,
  onSelect,
  onSelectMilestone,
  showGenerateRemaining = false,
  onGenerateRemaining,
  getMilestoneStatus,
}: ArtworkV2PickerScreenProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    () => new Set(defaultExpandedDays ?? []),
  );

  const toggleExpanded = useCallback((relativeDay: number) => {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(relativeDay)) {
        next.delete(relativeDay);
      } else {
        next.add(relativeDay);
      }
      return next;
    });
  }, []);

  const phaseGroups = useMemo(() => {
    if (!isPhaseWorkflow) {
      return null;
    }

    const phaseItems = items.filter(isPhaseEntry);
    if (phaseItems.length === 0) {
      return null;
    }

    const grouped = groupArtworkPhasesByMilestone(phaseItems);
    return grouped.map((group) => ({
      ...group,
      formats: group.formats.map((format) => items.find((entry) => entry.id === format.id)!),
    }));
  }, [isPhaseWorkflow, items]);

  async function handleDownload(entry: ArtworkV2PickerEntry) {
    if (!entry.downloadUrl || downloadingId) return;

    setDownloadingId(entry.id);
    try {
      await downloadArtworkImage(entry.downloadUrl, entry.downloadFilename);
    } catch {
      // Allow retry.
    } finally {
      setDownloadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <p className="studio-eyebrow">Create</p>
          <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">Artwork</h2>
        </header>
        <Card padding="lg" className="text-center">
          <p className="text-sm text-cos-muted">No artwork is needed for this campaign.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">Create</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">Artwork</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
          {isPhaseWorkflow
            ? "Create artwork once per milestone — we generate a 1:1 feed image and a 9:16 story version from the same design."
            : "Choose what you\u2019d like to create. Approved artwork can be downloaded from here."}
        </p>
        {showGenerateRemaining && onGenerateRemaining && (
          <div className="mt-4">
            <Button type="button" size="lg" onClick={onGenerateRemaining}>
              Generate remaining artwork
            </Button>
            <p className="mt-2 max-w-2xl text-xs text-cos-muted">
              Uses your approved milestone as a style reference. You&apos;ll review each result before
              anything is approved.
            </p>
          </div>
        )}
      </header>

      {phaseGroups ? (
        <Card padding="none">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Campaign milestones</CardTitle>
            <CardDescription>
              One creation flow per milestone — feed (1:1) and story (9:16) from the same design.
            </CardDescription>
          </CardHeader>
          <ul className="space-y-4 px-5 pb-5">
          {phaseGroups.map((group) => {
            const progress = milestoneProgress(group.formats);
            const milestoneStatus = getMilestoneStatus?.(group.relativeDay) ?? (
              progress.complete
                ? "complete"
                : progress.approved > 0
                  ? "in_progress"
                  : "not_started"
            );
            const feed = group.formats.find((format) => format.metaPlacement === "feed");
            const story = group.formats.find((format) => format.metaPlacement === "story");
            const expanded = expandedDays.has(group.relativeDay);
            const openLabel =
              milestoneStatus === "complete"
                ? "View"
                : milestoneStatus === "ready_for_review"
                  ? "Review"
                  : progress.approved > 0
                    ? "Continue"
                    : "Create";

            return (
              <li key={group.relativeDay}>
                <article {...milestoneAccordionCardProps(expanded)}>
                  <div className="flex items-start gap-2 border-b border-cos-border px-4 py-4">
                    <button
                      type="button"
                      className="mt-1 shrink-0 rounded-lg p-1 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
                      onClick={() => toggleExpanded(group.relativeDay)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "Collapse milestone" : "Expand milestone"}
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => toggleExpanded(group.relativeDay)}
                      aria-expanded={expanded}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-2xl text-cos-text">{group.title}</h3>
                          <p className="mt-0.5 text-xs text-cos-muted">
                            {milestoneStatusDescription(milestoneStatus, progress)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            milestoneStatus === "complete"
                              ? "bg-emerald-50 text-emerald-700"
                              : milestoneStatus === "ready_for_review"
                                ? "bg-amber-50 text-amber-800"
                                : milestoneStatus === "in_progress"
                                  ? "bg-cos-bg text-cos-muted"
                                  : "bg-cos-bg text-cos-muted",
                          )}
                        >
                          {milestoneStatusLabel(milestoneStatus)}
                        </span>
                      </div>
                    </button>

                    {onSelectMilestone && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => onSelectMilestone(group.relativeDay)}
                      >
                        {openLabel}
                      </Button>
                    )}
                  </div>

                  {expanded && (feed?.downloadUrl || story?.downloadUrl) && (
                    <div className="flex items-end gap-4 px-5 py-4">
                      {feed?.downloadUrl && (
                        <div className="relative">
                          <ArtworkLightboxThumbnail
                            src={feed.downloadUrl}
                            alt={`${group.title} feed artwork`}
                            label="Feed 1:1"
                            variant="feed"
                            wrapperClassName="w-16"
                            frameClassName="aspect-square"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="absolute -right-1 -top-1 h-7 w-7 p-0"
                            disabled={downloadingId === feed.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDownload(feed);
                            }}
                            aria-label={`Download ${group.title} feed`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {story?.downloadUrl && (
                        <div className="relative">
                          <ArtworkLightboxThumbnail
                            src={story.downloadUrl}
                            alt={`${group.title} story artwork`}
                            label="Story 9:16"
                            variant="story"
                            wrapperClassName="w-12"
                            frameClassName="aspect-[9/16]"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="absolute -right-1 -top-1 h-7 w-7 p-0"
                            disabled={downloadingId === story.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDownload(story);
                            }}
                            aria-label={`Download ${group.title} story`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              </li>
            );
          })}
          </ul>
        </Card>
      ) : (
        <Card padding="none">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Campaign artwork</CardTitle>
            <CardDescription>
              Choose what to create. Approved artwork can be downloaded from here.
            </CardDescription>
          </CardHeader>
          <ul className="divide-y divide-cos-border">
          {items.map((item) => (
            <li key={item.id} className="flex gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 border border-cos-border bg-cos-card px-5 py-4 text-left transition-colors",
                  "hover:border-cos-primary/40 hover:bg-cos-info/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-primary",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center border text-xs",
                    item.isApproved
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-cos-border bg-cos-bg text-cos-muted",
                  )}
                  aria-hidden
                >
                  {item.isApproved ? "✓" : "□"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-lg text-cos-text">{item.label}</span>
                  {item.channelLabel && (
                    <span className="mt-0.5 block truncate text-xs text-cos-muted">
                      {item.channelLabel}
                    </span>
                  )}
                  {item.isApproved && (
                    <span className="mt-0.5 block text-xs text-emerald-700">Approved</span>
                  )}
                </span>
              </button>

              {item.downloadUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0 self-stretch px-3"
                  disabled={downloadingId === item.id}
                  onClick={() => void handleDownload(item)}
                  aria-label={`Download ${item.label}`}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {downloadingId === item.id ? "Saving…" : "Download"}
                  </span>
                </Button>
              )}
            </li>
          ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
