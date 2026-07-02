import { CommunicationHealthRing } from "@/components/playbooks/CommunicationHealthRing";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { calculateCommunicationHealth } from "@/lib/playbooks/health";
import type { EventCommunicationStep } from "@/types/playbooks";

interface CommunicationHealthSectionProps {
  steps: EventCommunicationStep[];
}

export function CommunicationHealthSection({
  steps,
}: CommunicationHealthSectionProps) {
  const health = calculateCommunicationHealth(steps);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
        <CardDescription>
          What you&apos;ve finished and what&apos;s still ahead.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10">
        <CommunicationHealthRing percent={health.healthPercent} size="lg" />

        <div className="grid w-full flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-cos-border bg-cos-bg/60 p-4 text-center">
            <p className="text-2xl font-semibold text-cos-text">
              {health.completedRequired}
            </p>
            <p className="mt-1 text-xs text-cos-muted">Done</p>
          </div>
          <div className="rounded-xl border border-cos-border bg-cos-bg/60 p-4 text-center">
            <p className="text-2xl font-semibold text-cos-text">
              {health.totalRequired - health.completedRequired}
            </p>
            <p className="mt-1 text-xs text-cos-muted">Still to do</p>
          </div>
          <div className="col-span-2 rounded-xl border border-cos-border bg-cos-bg/60 p-4 text-center sm:col-span-1">
            <p className="text-2xl font-semibold text-cos-text">{steps.length}</p>
            <p className="mt-1 text-xs text-cos-muted">Steps</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
