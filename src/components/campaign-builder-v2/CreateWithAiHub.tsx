import { CalendarPlus, Lock, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type CreateWithAiHubEvent = {
  id: string;
  title: string;
  date?: string | null;
};

type CreateWithAiHubProps = {
  canUseCreateWithAi: boolean;
  events: CreateWithAiHubEvent[];
  organizationName?: string | null;
};

/**
 * Empty / access states for Create with AI.
 * When events exist, `/create-with-ai` redirects into the builder on Creative Setup.
 */
export function CreateWithAiHub({
  canUseCreateWithAi,
  events,
  organizationName,
}: CreateWithAiHubProps) {
  if (!canUseCreateWithAi) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-cos-muted">
            Create with AI
          </p>
          <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
            Access needed
          </h1>
        </header>
        <div className="rounded-2xl border border-cos-border bg-cos-card px-6 py-8">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-cos-muted" strokeWidth={1.5} />
            <div className="space-y-2">
              <p className="text-sm font-medium text-cos-text">
                Your role can’t open Create with AI yet
              </p>
              <p className="text-sm leading-relaxed text-cos-muted">
                Ask an admin to grant artwork / campaign create access for
                {organizationName ? ` ${organizationName}` : " this organization"}
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-cos-muted">
            Create with AI
          </p>
          <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
            Build your first campaign
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-cos-muted sm:text-base">
            Create with AI runs on an event — inspiration, artwork, captions, and
            approvals all stay tied to that campaign. Add an event to get started
            {organizationName ? ` for ${organizationName}` : ""}.
          </p>
        </header>

        <div className="rounded-2xl border border-cos-border bg-cos-card px-6 py-8">
          <div className="flex items-start gap-3">
            <WandSparkles
              className="mt-0.5 h-5 w-5 shrink-0 text-cos-accent"
              strokeWidth={1.5}
            />
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-cos-text">No events yet</p>
                <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                  Once you have an event, Create with AI opens Creative Setup in
                  the builder — not a choose-event list.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button href="/events/create" size="md">
                  <CalendarPlus className="h-4 w-4" strokeWidth={1.5} />
                  Create an event
                </Button>
                <Button href="/events" variant="secondary" size="md">
                  View events
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Events exist — page should redirect before rendering this. Fallback only.
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-cos-muted">
          Create with AI
        </p>
        <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
          Opening Creative Setup
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-cos-muted sm:text-base">
          Taking you into the Create with AI builder…
        </p>
      </header>
    </div>
  );
}
