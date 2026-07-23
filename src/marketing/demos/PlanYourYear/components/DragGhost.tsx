"use client";

import { motion, useTransform } from "motion/react";
import { useTimeline } from "@/marketing/engine";
import { CalendarCard } from "./CalendarCard";
import { PLAN_YOUR_YEAR_DEMO } from "../demoData";

/** Absolute ghost card that follows the drag path Wed → Fri during the DnD beat. */
export function DragGhost() {
  const timeline = useTimeline();
  const { dragPost } = PLAN_YOUR_YEAR_DEMO;

  const opacity = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 0;
    if (t < 4.2 || t > 8.5) return 0;
    if (t < 4.5) return (t - 4.2) / 0.3;
    if (t > 8.1) return 1 - (t - 8.1) / 0.4;
    return 1;
  });

  const left = useTransform(timeline.time, [4.2, 8.0], ["42%", "68%"]);
  const top = useTransform(timeline.time, [4.2, 6.0, 8.0], ["38%", "32%", "38%"]);
  const scale = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return 1;
    if (t >= 4.2 && t <= 8.5) return 1.05;
    return 1;
  });
  const rotate = useTransform(timeline.time, (t) => {
    if (timeline.reducedMotion) return "0deg";
    if (t >= 4.2 && t <= 8.5) return "-2deg";
    return "0deg";
  });

  return (
    <motion.div
      className="pointer-events-none absolute z-30 w-[6.5rem] sm:w-[7.5rem]"
      style={{ opacity, left, top, scale, rotate }}
      aria-hidden
    >
      <CalendarCard
        kind={dragPost.kind}
        category={dragPost.category}
        title={dragPost.title}
        status={dragPost.status}
        platforms={dragPost.platforms}
        showGrip
        highlighted
        className="flex gap-1 rounded-md border border-[var(--cos-accent)] bg-[var(--cos-card)] px-1 py-1 shadow-md ring-1 ring-[var(--cos-accent)]/25"
      />
    </motion.div>
  );
}
