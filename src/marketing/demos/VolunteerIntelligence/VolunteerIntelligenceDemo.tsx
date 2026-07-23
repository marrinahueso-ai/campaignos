"use client";

import type { ReactNode } from "react";
import {
  CountUp,
  DemoPlayer,
  FadeSlide,
  ProgressBar,
  Toast,
  useTimeline,
} from "@/marketing/engine";
import { MarketingDemoShell } from "@/marketing/demos/_shared/MarketingDemoShell";
import { VOLUNTEER_INTELLIGENCE_DEMO } from "./demoData";
import { VOLUNTEER_INTELLIGENCE_TIMELINE } from "./volunteerIntelligenceTimeline";

export interface VolunteerIntelligenceDemoProps {
  showControls?: boolean;
  forceReducedMotion?: boolean;
  className?: string;
}

export function VolunteerIntelligenceDemo({
  showControls = false,
  forceReducedMotion = false,
  className,
}: VolunteerIntelligenceDemoProps) {
  return (
    <DemoPlayer
      key={forceReducedMotion ? "vol-reduced" : "vol-motion"}
      timeline={VOLUNTEER_INTELLIGENCE_TIMELINE}
      loop
      autoPlay
      showControls={showControls}
      forceReducedMotion={forceReducedMotion}
      className={className}
      aria-label="Volunteer Intelligence product demonstration"
      fallback={
        <div
          className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)]"
          aria-hidden
        >
          Preparing demo…
        </div>
      }
    >
      <VolunteerStage />
    </DemoPlayer>
  );
}

export default VolunteerIntelligenceDemo;

function VolunteerStage() {
  useTimeline();
  const { labels, kpis, roles, toast } = VOLUNTEER_INTELLIGENCE_DEMO;

  return (
    <MarketingDemoShell
      eyebrow={labels.workspace}
      title={labels.title}
      meta={
        <span className="hidden text-xs text-[var(--cos-muted)] sm:inline">
          {labels.event}
        </span>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
        <FadeSlide cue="kpis" direction="up" distance={8} holdAfter>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Kpi
              label="Fill rate"
              value={
                <CountUp
                  cue="kpis"
                  from={0}
                  to={kpis.fillRate}
                  duration={1.4}
                  suffix="%"
                  className="font-serif text-2xl text-[var(--cos-text)] sm:text-3xl"
                />
              }
            />
            <Kpi
              label="Underfilled"
              value={
                <CountUp
                  cue="kpis"
                  from={0}
                  to={kpis.underfilled}
                  duration={1.1}
                  className="font-serif text-2xl text-[var(--cos-text)] sm:text-3xl"
                />
              }
            />
            <Kpi
              label="Volunteers"
              value={
                <CountUp
                  cue="kpis"
                  from={0}
                  to={kpis.totalVolunteers}
                  duration={1.2}
                  className="font-serif text-2xl text-[var(--cos-text)] sm:text-3xl"
                />
              }
            />
          </div>
        </FadeSlide>

        <FadeSlide cue="roles" direction="up" distance={8} holdAfter>
          <ul className="space-y-2.5">
            {roles.map((role) => {
              const ratio = role.filled / role.needed;
              const needsHelp = role.filled < role.needed;
              return (
                <li
                  key={role.name}
                  className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="text-[var(--cos-text)]">{role.name}</span>
                    <span
                      className={
                        needsHelp
                          ? "text-xs font-medium text-[var(--cos-warning-text)]"
                          : "text-xs text-[var(--cos-muted)]"
                      }
                    >
                      {role.filled}/{role.needed}
                      {needsHelp ? " · needs help" : " · filled"}
                    </span>
                  </div>
                  <ProgressBar
                    cue="roles"
                    value={ratio}
                    from={0}
                    duration={1.1}
                    height={6}
                  />
                </li>
              );
            })}
          </ul>
        </FadeSlide>
      </div>

      <Toast
        cue="toast"
        title={toast.title}
        description={toast.description}
        status="info"
        announce={false}
        className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex max-w-sm items-start gap-2 rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-2.5 shadow-sm sm:left-auto sm:right-3"
      />
    </MarketingDemoShell>
  );
}

function Kpi({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-3">
      <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
        {label}
      </p>
      <div className="mt-1">{value}</div>
    </div>
  );
}
