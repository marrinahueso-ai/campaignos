import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { OnboardingChecklistItem } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils/cn";

interface OnboardingChecklistCardsProps {
  items: OnboardingChecklistItem[];
  title?: string;
  description?: string;
}

export function OnboardingChecklistCards({
  items,
  title = "Get started",
  description = "Finish these when you’re ready — everything is optional after your first event.",
}: OnboardingChecklistCardsProps) {
  const pending = items.filter((item) => !item.done);
  if (pending.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-label={title}>
      <div>
        <h2 className="font-display text-2xl text-cos-text">{title}</h2>
        <p className="mt-1 text-sm text-cos-muted">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border border-cos-border bg-cos-card p-4",
              item.done && "opacity-70",
            )}
          >
            <div className="flex items-start gap-3">
              {item.done ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                  strokeWidth={1.75}
                />
              ) : (
                <Circle
                  className="mt-0.5 h-5 w-5 shrink-0 text-cos-muted"
                  strokeWidth={1.75}
                />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-cos-text">{item.title}</h3>
                <p className="mt-1 text-sm text-cos-muted">{item.description}</p>
                {item.optional && !item.done ? (
                  <p className="mt-1 text-xs text-cos-muted">Optional</p>
                ) : null}
              </div>
            </div>
            {!item.done ? (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-cos-text hover:text-cos-primary"
              >
                {item.cta}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
