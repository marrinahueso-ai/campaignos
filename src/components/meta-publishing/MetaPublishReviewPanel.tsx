"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarRange, CheckCircle2, Clock, Send } from "lucide-react";
import { LifecycleSectionCard } from "@/components/layout/LifecycleSectionCard";
import { MetaPublishMilestoneRow } from "@/components/meta-publishing/MetaPublishMilestoneRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  approveAllScheduledMetaBundlesAction,
  publishAllActionableMetaBundlesNowAction,
  publishMetaBundleNowAction,
} from "@/lib/meta-publishing/actions";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface MetaPublishReviewPanelProps {
  eventId: string;
  bundles: MetaPublishBundle[];
}

export function MetaPublishReviewPanel({ eventId, bundles }: MetaPublishReviewPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [publishPendingDay, setPublishPendingDay] = useState<number | null>(null);

  const activeBundles = useMemo(
    () => bundles.filter((bundle) => bundle.status !== "skipped"),
    [bundles],
  );

  const queue = activeBundles.filter((bundle) => ["ready", "failed"].includes(bundle.status));
  const scheduled = activeBundles.filter((bundle) =>
    ["scheduled", "approved"].includes(bundle.status),
  );
  const published = activeBundles.filter((bundle) => bundle.status === "published");

  function runAction(action: () => Promise<{ success: boolean; error?: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  function runPublishNow(relativeDay: number) {
    setError(null);
    setPublishPendingDay(relativeDay);
    startTransition(async () => {
      const result = await publishMetaBundleNowAction(eventId, relativeDay);
      setPublishPendingDay(null);
      if (!result.success) {
        setError(result.error ?? "Unable to publish this milestone.");
        return;
      }
      router.refresh();
    });
  }

  const hasAny =
    queue.length > 0 || scheduled.length > 0 || published.length > 0;

  if (!hasAny) {
    return (
      <EmptyState
        icon={Send}
        title="Nothing ready to publish"
        description="Approve artwork and captions in Captions first."
        action={{ label: "Go to Captions", href: "#schedule" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <LifecycleSectionCard
          id="publish-queue"
          title="Queue"
          description="Ready to post to Facebook now."
          action={
            queue.length > 0 ? (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => runAction(() => publishAllActionableMetaBundlesNowAction(eventId))}
              >
                {isPending ? "Publishing…" : `Publish all (${queue.length})`}
              </Button>
            ) : undefined
          }
        >
          {queue.length === 0 ? (
            <SectionEmpty icon={Send} message="Nothing in the queue yet." />
          ) : (
            <ul className="space-y-2">
              {queue.map((bundle) => (
                <MetaPublishMilestoneRow
                  key={bundle.relativeDay}
                  bundle={bundle}
                  onPublish={() => runPublishNow(bundle.relativeDay)}
                  publishPending={publishPendingDay === bundle.relativeDay}
                />
              ))}
            </ul>
          )}
        </LifecycleSectionCard>

        <LifecycleSectionCard
          id="publish-scheduled"
          title="Scheduled"
          description="Set to go out on a future date."
          action={
            scheduled.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => runAction(() => approveAllScheduledMetaBundlesAction(eventId))}
              >
                Queue all ({scheduled.length})
              </Button>
            ) : undefined
          }
        >
          {scheduled.length === 0 ? (
            <SectionEmpty icon={Clock} message="No scheduled posts." />
          ) : (
            <ul className="space-y-2">
              {scheduled.map((bundle) => (
                <MetaPublishMilestoneRow
                  key={bundle.relativeDay}
                  bundle={bundle}
                  onPublish={() => runPublishNow(bundle.relativeDay)}
                  publishPending={publishPendingDay === bundle.relativeDay}
                />
              ))}
            </ul>
          )}
        </LifecycleSectionCard>

        <LifecycleSectionCard
          id="publish-history"
          title="Published"
          description="Already posted to Facebook."
          action={
            published.length > 0 ? (
              <Button href="#published" size="sm" variant="secondary">
                View all
              </Button>
            ) : undefined
          }
        >
          {published.length === 0 ? (
            <SectionEmpty icon={CheckCircle2} message="Nothing published yet." />
          ) : (
            <ul className="space-y-2">
              {published.map((bundle) => (
                <MetaPublishMilestoneRow key={bundle.relativeDay} bundle={bundle} />
              ))}
            </ul>
          )}
        </LifecycleSectionCard>

        <LifecycleSectionCard
          id="publish-calendar"
          title="Calendar"
          description="See this campaign on your school calendar."
        >
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-cos-muted">
              Published and upcoming posts appear on the main calendar with your other events.
            </p>
            <Button href="/calendar" variant="secondary" size="sm">
              <CalendarRange className="h-4 w-4" />
              Open calendar
            </Button>
          </div>
        </LifecycleSectionCard>
      </div>
    </div>
  );
}

function SectionEmpty({
  icon: Icon,
  message,
}: {
  icon: typeof Send;
  message: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-cos-muted">
      <Icon className="h-4 w-4 shrink-0 opacity-60" />
      {message}
    </p>
  );
}
