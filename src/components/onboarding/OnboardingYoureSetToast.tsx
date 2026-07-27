"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface OnboardingYoureSetToastProps {
  eventTitle: string;
}

/**
 * First-time setup page 4 — light “You’re set” arrival on the created event.
 * Exact Ease look from `public/onboarding-setup-ease-mockup.html?view=done`.
 */
export function OnboardingYoureSetToast({
  eventTitle,
}: OnboardingYoureSetToastProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  const label = eventTitle.trim() || "your event";

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("welcome")) return;
    url.searchParams.delete("welcome");
    const qs = url.searchParams.toString();
    router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, {
      scroll: false,
    });
  }, [router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      data-onboarding-ease="youre-set"
      className="mb-5 flex flex-wrap items-center justify-between gap-2.5 gap-x-4 rounded-2xl border border-[rgba(47,74,60,0.16)] bg-[rgba(255,252,247,0.92)] px-4 py-3 shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
      style={{
        animation:
          "onboarding-youre-set-toast-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both",
      }}
    >
      <div className="min-w-0">
        <strong
          className="block text-base font-semibold tracking-[-0.01em] text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          You’re set — here’s your event
        </strong>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#5c554c]">
          {label} is ready. Optional setup can wait; start planning whenever you
          like.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 border-none bg-transparent py-1 text-xs font-bold text-[#7a7166] hover:text-[#2a2622]"
      >
        Got it
      </button>
    </div>
  );
}
