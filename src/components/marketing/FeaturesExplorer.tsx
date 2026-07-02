"use client";

import { useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  LayoutDashboard,
  Megaphone,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface FeatureDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  details: string[];
}

const FEATURES: FeatureDefinition[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "A dashboard that feels like a friend",
    summary:
      "Open CampaignOS and know exactly what deserves your attention — without a wall of tasks.",
    details: [
      "Next Up highlights the one thing to focus on right now",
      "Quick snapshots for approvals and recently published posts",
      "Weather and your week on the side — context, not clutter",
    ],
  },
  {
    id: "workflow",
    icon: Megaphone,
    title: "Campaign workflow, step by step",
    summary:
      "Every event moves through a clear path: plan → artwork → schedule → publish.",
    details: [
      "Communication plan tailored to your event type",
      "Artwork and captions stay tied to each milestone",
      "Review & publish when your team is ready",
    ],
  },
  {
    id: "calendar",
    icon: CalendarRange,
    title: "One calendar for the whole school year",
    summary:
      "Events, post deadlines, and reminders — layered on a single view you can actually read.",
    details: [
      "Import your school calendar once during setup",
      "Toggle layers: campaigns, drafts, scheduled posts, events",
      "Hover any day to see what's coming up",
    ],
  },
  {
    id: "artwork",
    icon: ImageIcon,
    title: "Artwork studio for every milestone",
    summary:
      "Create feed and story graphics in one flow — no Canva juggling unless you want it.",
    details: [
      "One creation flow per milestone (1:1 feed + 9:16 story)",
      "AI-assisted prompts using your school brand",
      "Import from Canva when you're already there",
    ],
  },
  {
    id: "approvals",
    icon: Users,
    title: "Team roster & approvals",
    summary:
      "Upload your board structure once. Route captions and posts to the right person.",
    details: [
      "Import VP and committee roster from Excel",
      "Assign approval roles per event",
      "Track what's waiting on you vs. your team",
    ],
  },
  {
    id: "publish",
    icon: Send,
    title: "Publish to Facebook & Instagram",
    summary:
      "Schedule Meta posts from the same place you planned them — feed and story together.",
    details: [
      "Draft and approve captions per milestone",
      "Schedule all ready posts in one click",
      "See published history without leaving the workspace",
    ],
  },
];

export function FeaturesExplorer() {
  const [activeId, setActiveId] = useState(FEATURES[0]!.id);
  const active = FEATURES.find((feature) => feature.id === activeId) ?? FEATURES[0]!;

  return (
    <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
      <div className="space-y-3">
        {FEATURES.map((feature) => {
          const isOpen = feature.id === activeId;
          const Icon = feature.icon;

          return (
            <div
              key={feature.id}
              className={cn(
                "border transition-colors duration-200",
                isOpen
                  ? "border-cos-text/20 bg-cos-card"
                  : "border-cos-border bg-cos-card/60 hover:border-cos-border hover:bg-cos-card",
              )}
            >
              <button
                type="button"
                className="flex w-full items-start gap-4 px-5 py-4 text-left"
                onClick={() => setActiveId(feature.id)}
                aria-expanded={isOpen}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border transition-colors",
                    isOpen
                      ? "border-cos-text bg-cos-text text-white"
                      : "border-cos-border bg-cos-bg text-cos-accent",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-display text-xl text-cos-text">{feature.title}</span>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-cos-muted transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-cos-muted">
                    {feature.summary}
                  </span>
                </span>
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <ul className="space-y-2 border-t border-cos-border/70 px-5 py-4 pl-[4.25rem]">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex gap-2 text-sm text-cos-muted">
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cos-success"
                          strokeWidth={2}
                        />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="cos-card min-h-[420px] overflow-hidden p-0">
          <div className="border-b border-cos-border px-5 py-4">
            <p className="cos-section-title">Interactive preview</p>
            <p className="mt-1 font-display text-2xl text-cos-text">{active.title}</p>
          </div>
          <div className="p-5">
            <FeatureDemo featureId={active.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureDemo({ featureId }: { featureId: string }) {
  switch (featureId) {
    case "dashboard":
      return <DashboardDemo />;
    case "workflow":
      return <WorkflowDemo />;
    case "calendar":
      return <CalendarDemo />;
    case "artwork":
      return <ArtworkDemo />;
    case "approvals":
      return <ApprovalsDemo />;
    case "publish":
      return <PublishDemo />;
    default:
      return null;
  }
}

function DashboardDemo() {
  return (
    <div className="space-y-4">
      <div className="border border-cos-border bg-cos-bg/40 p-4">
        <p className="cos-section-title">Next up</p>
        <p className="font-display mt-2 text-2xl text-cos-text">Fall Festival</p>
        <p className="mt-1 text-sm text-cos-muted">Continue Save the Date artwork</p>
        <span className="mt-3 inline-flex bg-cos-text px-3 py-1.5 text-xs font-medium text-white">
          Continue →
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniPanel title="Needs your review">
          <p className="text-sm text-cos-muted">Instagram · Fall Festival</p>
        </MiniPanel>
        <MiniPanel title="Recently published">
          <p className="text-sm text-cos-muted">Facebook post · yesterday</p>
        </MiniPanel>
      </div>
    </div>
  );
}

function WorkflowDemo() {
  const steps = [
    "Communication Plan",
    "Artwork",
    "Posts & Schedule",
    "Review & Publish",
    "Published",
  ];
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-cos-border pb-3">
        {steps.map((step, index) => (
          <button
            key={step}
            type="button"
            onClick={() => setActiveStep(index)}
            className={cn(
              "px-2 py-1 text-[10px] font-medium tracking-wide uppercase transition-colors",
              activeStep === index
                ? "bg-cos-text text-white"
                : "bg-cos-bg text-cos-muted hover:text-cos-text",
            )}
          >
            {step.split(" ")[0]}
          </button>
        ))}
      </div>
      <div className="border border-cos-border bg-cos-bg/30 p-4">
        <p className="cos-section-title">{steps[activeStep]}</p>
        <p className="mt-2 font-display text-xl text-cos-text">
          {activeStep === 0 && "Customize your communication timeline"}
          {activeStep === 1 && "Create feed + story artwork"}
          {activeStep === 2 && "Draft captions & schedule posts"}
          {activeStep === 3 && "Approve and queue for Meta"}
          {activeStep === 4 && "See what went live"}
        </p>
        <p className="mt-2 text-sm text-cos-muted">
          Tap a step above to explore the workflow.
        </p>
      </div>
    </div>
  );
}

function CalendarDemo() {
  const [hoveredDay, setHoveredDay] = useState<number | null>(3);

  const events: Record<number, string[]> = {
    1: ["School Supply Deadline"],
    3: ["Fall Festival · Day Before", "PTO Meeting"],
    8: ["Fall Festival · Day Of"],
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-cos-muted">July 2026</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-cos-muted">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
        {Array.from({ length: 14 }, (_, index) => {
          const day = index + 1;
          const hasEvents = Boolean(events[day]);
          const isHovered = hoveredDay === day;

          return (
            <button
              key={day}
              type="button"
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded py-1 transition-colors",
                isHovered && "bg-cos-bg",
              )}
              onMouseEnter={() => setHoveredDay(day)}
              onFocus={() => setHoveredDay(day)}
            >
              <span className="text-xs text-cos-text">{day}</span>
              {hasEvents && (
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-cos-success" />
                  <span className="h-1 w-1 rounded-full bg-cos-accent" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="min-h-[4.5rem] border border-cos-border bg-cos-bg/40 p-3">
        {hoveredDay && events[hoveredDay] ? (
          <ul className="space-y-1">
            {events[hoveredDay]!.map((item) => (
              <li key={item} className="text-sm text-cos-text">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-cos-muted">Hover a dotted day to preview events.</p>
        )}
      </div>
    </div>
  );
}

function ArtworkDemo() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <div className="border border-cos-border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <span>
            <span className="font-display text-xl text-cos-text">Day Before</span>
            <span className="mt-0.5 block text-xs text-cos-muted">Feed + Story · one flow</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-cos-muted transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex gap-3 border-t border-cos-border px-4 py-3">
              <div className="aspect-square w-16 bg-cos-bg" />
              <div className="aspect-[9/16] w-10 bg-cos-bg" />
              <div className="flex flex-col justify-center gap-2">
                <Sparkles className="h-4 w-4 text-cos-accent" />
                <span className="text-xs text-cos-muted">Generate from your brand kit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-cos-muted">Expand any milestone to create artwork in place.</p>
    </div>
  );
}

function ApprovalsDemo() {
  const [approved, setApproved] = useState(false);

  return (
    <div className="space-y-4">
      <div className="border border-cos-border bg-cos-bg/30 p-4">
        <p className="cos-section-title">Board roster</p>
        <div className="mt-3 space-y-2">
          <RosterRow role="President" name="Rebecca K." filled />
          <RosterRow role="VP · Events" name="Open" filled={false} />
        </div>
      </div>
      <div className="border border-cos-border p-4">
        <p className="text-sm font-medium text-cos-text">Fall Festival · Feed caption</p>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          Mark your calendars! Our Fall Festival is almost here…
        </p>
        <button
          type="button"
          onClick={() => setApproved((value) => !value)}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
            approved
              ? "bg-emerald-50 text-emerald-800"
              : "bg-cos-text text-white hover:opacity-90",
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {approved ? "Approved" : "Approve caption"}
        </button>
      </div>
    </div>
  );
}

function PublishDemo() {
  const [scheduled, setScheduled] = useState(false);

  return (
    <div className="space-y-3">
      {[
        { label: "Day Before · Facebook + Instagram", ready: true },
        { label: "Day Of · Morning announcement", ready: false },
      ].map((post) => (
        <div
          key={post.label}
          className="flex items-center justify-between gap-3 border border-cos-border px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-cos-text">{post.label}</p>
            <p className="text-xs text-cos-muted">
              {post.ready ? (scheduled ? "Scheduled" : "Ready to schedule") : "Needs artwork"}
            </p>
          </div>
          {post.ready && (
            <button
              type="button"
              onClick={() => setScheduled(true)}
              disabled={scheduled}
              className={cn(
                "shrink-0 px-2.5 py-1 text-xs font-medium",
                scheduled
                  ? "bg-cos-bg text-cos-muted"
                  : "bg-cos-text text-white hover:opacity-90",
              )}
            >
              {scheduled ? "Queued" : "Schedule"}
            </button>
          )}
        </div>
      ))}
      <p className="text-sm text-cos-muted">Try scheduling — feed and story go out together.</p>
    </div>
  );
}

function MiniPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-cos-border bg-cos-bg/30 p-3">
      <p className="cos-section-title">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function RosterRow({
  role,
  name,
  filled,
}: {
  role: string;
  name: string;
  filled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-cos-text">{role}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-medium",
          filled ? "bg-emerald-50 text-emerald-700" : "bg-cos-bg text-cos-muted",
        )}
      >
        {name}
      </span>
    </div>
  );
}
