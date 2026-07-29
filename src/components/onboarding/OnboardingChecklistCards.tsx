"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { dismissOnboardingChecklistItemAction } from "@/lib/onboarding/actions";
import type {
  OnboardingChecklistDismissStep,
  OnboardingChecklistItem,
} from "@/lib/onboarding/types";

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
    <section className="space-y-2" aria-label={title}>
      <div>
        <h2 className="text-sm font-medium text-cos-text">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-cos-muted">{description}</p>
        ) : null}
      </div>
      <ul className="divide-y divide-cos-border/70 rounded-lg border border-cos-border/80 bg-cos-card/40">
        {pending.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap"
            data-onboarding-checklist-item={item.id}
            data-done={item.done ? "true" : "false"}
          >
            <span className="min-w-0 text-sm text-cos-text">{item.title}</span>
            <div className="flex shrink-0 items-center gap-2.5">
              <Link
                href={item.href}
                className="inline-flex items-center gap-0.5 text-sm font-medium text-cos-primary hover:underline"
              >
                {item.cta}
                <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden />
              </Link>
              {isDismissibleStep(item.id) ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleLater(item)}
                  className="text-xs text-cos-muted hover:text-cos-text disabled:opacity-60"
                >
                  Later
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
