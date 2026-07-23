"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AutoScroll,
  BadgeChange,
  Confetti,
  CountUp,
  Cursor,
  DemoPlayer,
  Drawer,
  FadeSlide,
  FloatingCard,
  Highlight,
  MouseClick,
  ProgressBar,
  ProgressRing,
  Pulse,
  Scene,
  SectionSpotlight,
  Skeleton,
  Toast,
  TypingAnimation,
  defineTimeline,
} from "@/marketing/engine";
import {
  getDefaultMarketingDemoId,
  listMarketingDemos,
} from "@/marketing/demo-generator/demoRegistry";

type HarnessTab = "demo" | "primitives";

const HARNESS_TIMELINE = defineTimeline({
  id: "motion-engine-harness",
  duration: 20,
  loop: true,
  cues: [
    { at: 0, id: "cursor-appear", label: "Cursor appears" },
    { at: 2, id: "cursor-move", label: "Cursor moves" },
    { at: 4, id: "button-highlight", label: "Button highlight" },
    { at: 6, id: "drawer-open", label: "Drawer opens" },
    { at: 8, id: "typing-start", label: "Typing begins" },
    { at: 12, id: "cards-fade", label: "Cards fade in" },
    { at: 14, id: "progress", label: "Progress animates" },
    { at: 16, id: "counter-start", label: "Counter animates" },
    { at: 17.5, id: "toast", label: "Toast" },
    { at: 18.5, id: "confetti", label: "Confetti" },
  ],
});

/**
 * Development harness — registered marketing demos + engine primitives.
 * Demo list comes from MARKETING_DEMO_REGISTRY (not hard-coded per demo).
 */
export function MotionEngineHarness() {
  const demos = useMemo(() => listMarketingDemos(), []);
  const [tab, setTab] = useState<HarnessTab>("demo");
  const [selectedDemoId, setSelectedDemoId] = useState(
    () => getDefaultMarketingDemoId(),
  );
  const [forceReducedMotion, setForceReducedMotion] = useState(false);
  const [confettiEnabled, setConfettiEnabled] = useState(true);
  const timeline = useMemo(() => HARNESS_TIMELINE, []);

  const selectedDemo =
    demos.find((demo) => demo.id === selectedDemoId) ?? demos[0];
  const SelectedDemo = selectedDemo?.Demo;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-[var(--cos-text)]">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cos-muted)]">
          Development only
        </p>
        <h1 className="font-serif text-3xl tracking-tight">
          Marketing Motion Engine harness
        </h1>
        <p className="max-w-2xl text-sm text-[var(--cos-muted)]">
          Private preview for registered marketing demos and the motion engine.
          Add demos via the Demo Generator registry. Unavailable in production.
        </p>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Harness views"
      >
        <TabButton active={tab === "demo"} onClick={() => setTab("demo")}>
          Marketing demos
        </TabButton>
        <TabButton
          active={tab === "primitives"}
          onClick={() => setTab("primitives")}
        >
          Engine primitives
        </TabButton>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-2">
          <input
            type="checkbox"
            checked={forceReducedMotion}
            onChange={(event) => setForceReducedMotion(event.target.checked)}
          />
          Force reduced motion
        </label>
        {tab === "primitives" ? (
          <label className="flex items-center gap-2 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-2">
            <input
              type="checkbox"
              checked={confettiEnabled}
              onChange={(event) => setConfettiEnabled(event.target.checked)}
            />
            Enable confetti
          </label>
        ) : null}
      </div>

      {tab === "demo" ? (
        <section
          role="tabpanel"
          aria-label="Marketing demos"
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-medium text-[var(--cos-text)]">
                {selectedDemo?.label ?? "Demo"}
              </h2>
              {selectedDemo?.description ? (
                <p className="max-w-2xl text-sm text-[var(--cos-muted)]">
                  {selectedDemo.description}
                </p>
              ) : null}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--cos-muted)]">Registered demo</span>
              <select
                value={selectedDemo?.id ?? ""}
                onChange={(event) => setSelectedDemoId(event.target.value)}
                className="rounded-lg border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cos-accent)]"
                aria-label="Select marketing demo"
              >
                {demos.map((demo) => (
                  <option key={demo.id} value={demo.id}>
                    {demo.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {SelectedDemo ? (
            <SelectedDemo
              showControls
              forceReducedMotion={forceReducedMotion}
            />
          ) : (
            <p className="text-sm text-[var(--cos-muted)]">
              No demos registered yet. See{" "}
              <code className="text-[var(--cos-text)]">
                src/marketing/demo-generator/README.md
              </code>
              .
            </p>
          )}

          <HarnessNotes
            title="Registered demo checklist"
            items={[
              "Demo appears from MARKETING_DEMO_REGISTRY",
              "Replay / pause / scrub / speed via engine controls",
              "Force reduced motion shows completed state",
              "Scroll away to confirm offscreen pause",
              "Do not wire to live marketing pages from this harness",
            ]}
          />
        </section>
      ) : (
        <section
          role="tabpanel"
          aria-label="Engine primitives"
          className="space-y-4"
        >
          <DemoPlayer
            key={forceReducedMotion ? "reduced" : "motion"}
            timeline={timeline}
            loop
            autoPlay
            showControls
            forceReducedMotion={forceReducedMotion}
            className="rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg)] p-4 shadow-sm"
            aria-label="Motion engine development harness"
            fallback={
              <div
                className="flex min-h-[28rem] items-center justify-center rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] text-sm text-[var(--cos-muted)]"
                aria-hidden
              >
                Preparing demo…
              </div>
            }
          >
            <SectionSpotlight
              cue="button-highlight"
              untilCue="drawer-open"
              inset="22% 12% 38% 12%"
              dimOpacity={0.22}
            >
              <div className="relative min-h-[28rem] overflow-hidden rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)]">
                <div className="border-b border-[var(--cos-border)] px-4 py-3">
                  <p className="text-sm font-medium">Placeholder workspace</p>
                  <p className="text-xs text-[var(--cos-muted)]">
                    Generic sample content for engine validation
                  </p>
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <Highlight
                      cue="button-highlight"
                      untilCue="drawer-open"
                      variant="outline"
                      className="inline-flex rounded-xl"
                    >
                      <Pulse
                        cue="button-highlight"
                        untilCue="drawer-open"
                        maxPulses={2}
                      >
                        <button
                          type="button"
                          className="rounded-xl bg-[var(--cos-text)] px-4 py-2 text-sm font-medium text-[var(--cos-card)]"
                        >
                          Sample action
                        </button>
                      </Pulse>
                    </Highlight>

                    <Scene
                      cue="typing-start"
                      untilCue="cards-fade"
                      enterDirection="up"
                    >
                      <TypingAnimation
                        cue="typing-start"
                        untilCue="cards-fade"
                        text="Draft a warm reminder for families about Friday’s event."
                        className="text-sm leading-relaxed text-[var(--cos-text)]"
                      />
                    </Scene>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FadeSlide cue="cards-fade" direction="up">
                        <FloatingCard
                          cue="cards-fade"
                          className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-bg)] p-3"
                        >
                          <p className="text-xs text-[var(--cos-muted)]">
                            Volunteers
                          </p>
                          <CountUp
                            cue="counter-start"
                            from={12}
                            to={48}
                            className="text-2xl font-semibold"
                            duration={1.4}
                          />
                        </FloatingCard>
                      </FadeSlide>
                      <FadeSlide cue="cards-fade" direction="up" delay={0.15}>
                        <div className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-bg)] p-3">
                          <p className="mb-2 text-xs text-[var(--cos-muted)]">
                            Status
                          </p>
                          <BadgeChange
                            cue="cards-fade"
                            fromLabel="Draft"
                            toLabel="Ready"
                            duration={0.6}
                          />
                          <div className="mt-3 space-y-2">
                            <ProgressBar
                              cue="progress"
                              value={0.82}
                              duration={1.2}
                            />
                            <ProgressRing
                              cue="progress"
                              value={0.82}
                              size={56}
                              duration={1.2}
                            />
                          </div>
                        </div>
                      </FadeSlide>
                    </div>

                    <AutoScroll
                      cue="cards-fade"
                      target="[data-scroll-target]"
                      className="h-28 rounded-xl border border-[var(--cos-border)] bg-[var(--cos-bg)] p-3"
                      duration={2}
                    >
                      <div className="space-y-2 text-xs text-[var(--cos-muted)]">
                        <p>Scroll region line 1</p>
                        <p>Scroll region line 2</p>
                        <p>Scroll region line 3</p>
                        <p>Scroll region line 4</p>
                        <p
                          data-scroll-target
                          className="font-medium text-[var(--cos-text)]"
                        >
                          Target row (auto-scrolled)
                        </p>
                        <p>Scroll region line 6</p>
                        <p>Scroll region line 7</p>
                      </div>
                    </AutoScroll>
                  </div>

                  <div className="relative min-h-[16rem] rounded-xl border border-dashed border-[var(--cos-border)] bg-[var(--cos-bg)] p-3">
                    <p className="mb-2 text-xs text-[var(--cos-muted)]">
                      Loading state
                    </p>
                    <Skeleton
                      cue="cursor-appear"
                      untilCue="typing-start"
                      rows={4}
                    />
                    <Scene
                      cue="typing-start"
                      holdAfter
                      className="mt-3 text-xs text-[var(--cos-muted)]"
                    >
                      Content ready
                    </Scene>
                  </div>
                </div>

                <Cursor
                  keyframes={[
                    { at: 0, x: "12%", y: "42%", opacity: 0 },
                    { at: 0.4, opacity: 1, x: "12%", y: "42%" },
                    { at: 2, x: "28%", y: "38%" },
                    { at: 4, x: "28%", y: "38%", click: true },
                    { at: 6, x: "78%", y: "48%" },
                    { at: 8, x: "40%", y: "55%" },
                  ]}
                />
                <MouseClick cue="button-highlight" x="28%" y="38%" />

                <Drawer
                  cue="drawer-open"
                  untilCue="typing-start"
                  placement="right"
                  size="46%"
                  panelClassName="absolute border border-[var(--cos-border)] bg-[var(--cos-card)] p-4 shadow-md"
                >
                  <p className="text-sm font-medium">Sample drawer</p>
                  <p className="mt-1 text-xs text-[var(--cos-muted)]">
                    Transform-based panel for demo chrome.
                  </p>
                </Drawer>

                <Toast
                  cue="toast"
                  until={19.5}
                  title="Reminder scheduled"
                  description="Placeholder toast for engine validation."
                  status="success"
                  announce={false}
                />

                <Confetti
                  enabled={confettiEnabled}
                  cue="confetti"
                  duration={1.2}
                  particleCount={12}
                />
              </div>
            </SectionSpotlight>
          </DemoPlayer>

          <HarnessNotes
            title="Engine primitives checklist"
            items={[
              "Play / pause / restart / scrub / speed controls",
              "Cursor, click, typing, count-up, progress",
              "Highlight, pulse, fade/slide, floating card",
              "Drawer, toast, badge, skeleton, spotlight",
              "Force reduced motion toggle",
              "Offscreen pause when scrolled away",
            ]}
          />
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-lg border border-[var(--cos-text)] bg-[var(--cos-text)] px-3 py-1.5 text-sm font-medium text-[var(--cos-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cos-accent)]"
          : "rounded-lg border border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-1.5 text-sm font-medium text-[var(--cos-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cos-accent)]"
      }
    >
      {children}
    </button>
  );
}

function HarnessNotes({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] p-4 text-sm text-[var(--cos-muted)]">
      <h2 className="mb-2 font-medium text-[var(--cos-text)]">{title}</h2>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
