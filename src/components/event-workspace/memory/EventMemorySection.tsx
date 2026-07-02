import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils/dates";
import type { EventMemory } from "@/lib/memory";

interface EventMemorySectionProps {
  memory: EventMemory;
}

export function EventMemorySection({ memory }: EventMemorySectionProps) {
  return (
    <div className="space-y-6">
      <CampaignSummaryCard summary={memory.campaignSummary} completion={memory.campaignCompletion} />
      <CommunicationsCreatedCard items={memory.communicationsCreated} />
      <ArtworkUsedCard items={memory.artworkUsed} />
      <FilesCard items={memory.filesUploaded} />
      <MemoryTimelineCard entries={memory.timeline} />
      <LessonsLearnedCard lessons={memory.lessonsLearned} />
      <NotesCard notes={memory.notes} />
      <ReuseNextYearCard preview={memory.reusePreview} />
    </div>
  );
}

function MemoryCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {children}
    </Card>
  );
}

function EmptyMemoryLine({ message }: { message: string }) {
  return <p className="text-sm leading-relaxed text-cos-muted">{message}</p>;
}

function CampaignSummaryCard({
  summary,
  completion,
}: {
  summary: EventMemory["campaignSummary"];
  completion: EventMemory["campaignCompletion"];
}) {
  return (
    <MemoryCard title="Campaign summary">
      <div className="space-y-3">
        <p className="text-sm font-medium text-cos-text">{summary.headline}</p>
        {summary.channelHighlights.length > 0 ? (
          <>
            <p className="text-sm text-cos-muted">{summary.introLine}</p>
            <ul className="space-y-1.5">
              {summary.channelHighlights.map((channel) => (
                <li
                  key={channel}
                  className="flex items-start gap-2 text-sm text-cos-text"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cos-success" />
                  <span>{channel}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyMemoryLine message="Communications will appear here as you create them." />
        )}
        {summary.artworkLine && (
          <p className="text-sm text-cos-muted">{summary.artworkLine}</p>
        )}
        {summary.closingLine && (
          <p className="text-sm text-cos-text">{summary.closingLine}</p>
        )}
        {completion && (
          <p className="text-xs text-cos-muted">
            {completion.percent}% complete · {completion.label}
          </p>
        )}
      </div>
    </MemoryCard>
  );
}

function CommunicationsCreatedCard({
  items,
}: {
  items: EventMemory["communicationsCreated"];
}) {
  return (
    <MemoryCard title="Communications created">
      {items.length === 0 ? (
        <EmptyMemoryLine message="Nothing drafted yet — messages will be remembered here." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-cos-border pb-3 last:border-b-0 last:pb-0"
            >
              <span className="text-sm font-medium text-cos-text">
                {item.channelLabel}
              </span>
              <span className="text-sm text-cos-muted">{item.statusLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </MemoryCard>
  );
}

function ArtworkUsedCard({ items }: { items: EventMemory["artworkUsed"] }) {
  return (
    <MemoryCard title="Artwork used">
      {items.length === 0 ? (
        <EmptyMemoryLine message="Artwork will show up here once uploaded." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-cos-text">{item.label}</p>
                {item.filename && (
                  <p className="text-xs text-cos-muted">{item.filename}</p>
                )}
              </div>
              <span className="text-sm text-cos-muted">{item.statusLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </MemoryCard>
  );
}

function FilesCard({ items }: { items: EventMemory["filesUploaded"] }) {
  return (
    <MemoryCard title="Files">
      {items.length === 0 ? (
        <EmptyMemoryLine message="Documents and other files will be kept here." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-cos-text">
              {item.label}
              {item.filename && (
                <span className="text-cos-muted"> · {item.filename}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </MemoryCard>
  );
}

function MemoryTimelineCard({ entries }: { entries: EventMemory["timeline"] }) {
  return (
    <MemoryCard
      title="Timeline"
      description="The story of this event — not a system log."
    >
      {entries.length === 0 ? (
        <EmptyMemoryLine message="Milestones will appear as the event takes shape." />
      ) : (
        <ol className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="border-l-2 border-cos-border pl-4">
              <p className="text-sm font-medium text-cos-text">{entry.title}</p>
              {entry.description && (
                <p className="mt-0.5 text-sm text-cos-muted">{entry.description}</p>
              )}
              <p className="mt-1 text-xs text-cos-muted">
                {formatDateTime(entry.occurredAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </MemoryCard>
  );
}

function LessonsLearnedCard({
  lessons,
}: {
  lessons: EventMemory["lessonsLearned"];
}) {
  return (
    <MemoryCard title="Lessons learned">
      {lessons.hasContent ? (
        <ul className="space-y-2">
          {lessons.items.map((item) => (
            <li key={item} className="text-sm leading-relaxed text-cos-text">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-1">
          <EmptyMemoryLine message="Nothing has been recorded yet." />
          <p className="text-sm leading-relaxed text-cos-muted">
            {lessons.placeholderMessage}
          </p>
        </div>
      )}
    </MemoryCard>
  );
}

function NotesCard({ notes }: { notes: string | null }) {
  return (
    <MemoryCard title="Notes">
      {notes ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
          {notes}
        </p>
      ) : (
        <EmptyMemoryLine message="Event details and planning notes will live here." />
      )}
    </MemoryCard>
  );
}

function ReuseNextYearCard({
  preview,
}: {
  preview: EventMemory["reusePreview"];
}) {
  return (
    <MemoryCard
      title="Reuse next year"
      description="What a future board could carry forward."
    >
      <ul className="space-y-2.5">
        {preview.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <Check
              className={
                item.available
                  ? "mt-0.5 h-4 w-4 shrink-0 text-cos-success"
                  : "mt-0.5 h-4 w-4 shrink-0 text-cos-border"
              }
            />
            <div>
              <span className={item.available ? "text-cos-text" : "text-cos-muted"}>
                {item.label}
              </span>
              {item.detail && (
                <p className="text-xs text-cos-muted">{item.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-cos-border pt-4">
        <Button variant="secondary" size="sm" disabled>
          <Sparkles className="h-4 w-4" />
          Preview reusable campaign
        </Button>
        <p className="mt-2 text-xs text-cos-muted">
          Coming soon — review and adapt this event for next year.
        </p>
      </div>
    </MemoryCard>
  );
}
