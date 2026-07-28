"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { dismissOnboardingChecklistItemAction } from "@/lib/onboarding/actions";
import type {
  OnboardingChecklistDismissStep,
  OnboardingChecklistItem,
} from "@/lib/onboarding/types";
import { cn } from "@/lib/utils/cn";

interface OnboardingChecklistCardsProps {
  items: OnboardingChecklistItem[];
  title?: string;
  description?: string;
}

function isDismissibleStep(
  id: OnboardingChecklistItem["id"],
): id is OnboardingChecklistDismissStep {
  return id === "calendar" || id === "brand" || id === "invite" || id === "meta";
}

export function OnboardingChecklistCards({
  items,
  title = "Helpful next steps",
  description = "Optional — do these whenever you’re ready.",
}: OnboardingChecklistCardsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pending = items.filter((item) => !item.done);
  if (pending.length === 0) {
    return null;
  }

  function handleLater(item: OnboardingChecklistItem) {
    if (!isDismissibleStep(item.id)) return;
    const step: OnboardingChecklistDismissStep = item.id;
    startTransition(async () => {
      const result = await dismissOnboardingChecklistItemAction(step);
      if (result.error) return;
      router.refresh();
    });
  }

  return (
    <section className="space-y-3" aria-label={title}>
      <div>
        <h2 className="font-display text-xl text-cos-text sm:text-2xl">{title}</h2>
        <p className="mt-0.5 text-sm text-cos-muted">{description}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border border-cos-border bg-cos-card px-3 py-2.5",
              item.done && "opacity-70",
            )}
            data-onboarding-checklist-item={item.id}
            data-done={item.done ? "true" : "false"}
          >
            {item.done ? (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-emerald-700"
                strokeWidth={1.75}
                aria-hidden
              />
            ) : (
              <Circle
                className="h-4 w-4 shrink-0 text-cos-muted"
                strokeWidth={1.75}
                aria-hidden
              />
            )}
            <h3 className="min-w-0 flex-1 text-sm font-medium leading-snug text-cos-text">
              {item.title}
            </h3>
            {!item.done ? (
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-cos-text hover:text-cos-primary sm:text-sm"
                >
                  {item.cta}
                  <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                </Link>
                {isDismissibleStep(item.id) ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleLater(item)}
                    className="text-xs text-cos-muted hover:text-cos-text disabled:opacity-60 sm:text-sm"
                  >
                    Later
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
