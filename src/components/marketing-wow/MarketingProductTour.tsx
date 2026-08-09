"use client";

import { useState } from "react";
import { MarketingProductDemoVideo } from "@/components/marketing/MarketingProductDemoVideo";
import type { MarketingProductDemoId } from "@/lib/marketing/product-demo-videos";
import { cn } from "@/lib/utils/cn";

type TourStep = {
  id: MarketingProductDemoId;
  /** Short product-area label (Calendar, Approvals, …) */
  area: string;
  title: string;
  body: string;
};

/** Product Tour steps — plain, specific jobs for PTO/PTA visitors. */
export const PRODUCT_TOUR_STEPS: TourStep[] = [
  {
    id: "calendar",
    area: "Calendar",
    title: "See the school year in one place",
    body: "Keep events, deadlines, scheduled posts, and what's coming next together on one calendar.",
  },
  {
    id: "event-planning",
    area: "Event planning",
    title: "Everything for the event, together",
    body: "Tasks, notes, files, team, and communications stay connected to the event — not scattered across chats and folders.",
  },
  {
    id: "create-with-ai",
    area: "Create with AI",
    title: "Turn an event into ready-to-share communications",
    body: "Create artwork, captions, and a communication plan without starting from a blank page.",
  },
  {
    id: "approvals",
    area: "Approvals",
    title: "Review before anything goes live",
    body: "Approve, request changes, and schedule communications from one place.",
  },
  {
    id: "volunteers",
    area: "Volunteers",
    title: "Know where you still need help",
    body: "See staffing progress and which roles still need volunteers.",
  },
  {
    id: "dashboard",
    area: "Dashboard",
    title: "Know what needs your attention",
    body: "Upcoming events, approvals, volunteer needs, and communications — in one calm view.",
  },
];

const DEFAULT_STEP: MarketingProductDemoId = "create-with-ai";

/**
 * Homepage Product Tour — one real Screen Studio demo at a time.
 * Visitors pick a workflow; only that video plays (calm, not six at once).
 */
export function MarketingProductTour() {
  const [activeId, setActiveId] = useState<MarketingProductDemoId>(DEFAULT_STEP);
  const active =
    PRODUCT_TOUR_STEPS.find((step) => step.id === activeId) ?? PRODUCT_TOUR_STEPS[2]!;

  return (
    <section
      id="tour"
      className="scroll-mt-20 border-t border-cos-border px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <p className="studio-eyebrow">Product tour</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl leading-tight text-cos-text sm:text-4xl lg:text-5xl">
          Hey Ralli puts the school year in one place.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-cos-muted sm:text-lg">
          Plan events. Create communications. Get approvals. Coordinate
          volunteers. Keep everyone on the same page.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-12">
          <ol className="order-2 grid gap-0 lg:order-1">
            {PRODUCT_TOUR_STEPS.map((step, index) => {
              const selected = step.id === activeId;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "border-t border-cos-border",
                    index === PRODUCT_TOUR_STEPS.length - 1 && "border-b",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(step.id)}
                    aria-pressed={selected}
                    className={cn(
                      "w-full py-5 text-left transition-colors sm:py-6",
                      selected
                        ? "bg-cos-brand-sage-soft/40"
                        : "hover:bg-cos-card/80",
                    )}
                  >
                    <span
                      className={cn(
                        "block px-3 sm:px-4",
                        selected &&
                          "border-l-[3px] border-cos-brand-sage pl-[calc(0.75rem-3px)] sm:pl-[calc(1rem-3px)]",
                      )}
                    >
                      <span className="text-[11px] font-bold tracking-[0.12em] text-cos-muted uppercase">
                        {step.area}
                      </span>
                      <strong
                        className={cn(
                          "font-display mt-1 block text-lg sm:text-xl",
                          selected ? "text-cos-text" : "text-cos-text/90",
                        )}
                      >
                        {step.title}
                      </strong>
                      <span className="mt-1.5 block max-w-md text-sm leading-relaxed text-cos-muted sm:text-base">
                        {step.body}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="order-1 lg:sticky lg:top-24 lg:order-2">
            <div className="overflow-hidden rounded-[18px] border border-cos-border/70 bg-cos-card p-1 shadow-[0_24px_60px_-28px_rgba(42,38,34,0.28)] sm:rounded-[20px] sm:p-1.5">
              <MarketingProductDemoVideo
                demoId={active.id}
                aspectClassName="aspect-[1960/1080]"
                sizes="(max-width: 1024px) 100vw, 640px"
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-cos-muted lg:hidden">
              <span className="font-semibold text-cos-text">{active.title}</span>
              {" — "}
              {active.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
