import type {
  Seconds,
  TimelineCue,
  TimelineDefinition,
  TimingProps,
} from "../types";
import { isActiveWindow, segmentProgress } from "./interpolate";

/** Create a validated timeline definition. */
export function defineTimeline(
  definition: TimelineDefinition,
): TimelineDefinition {
  if (!definition.id) {
    throw new Error("defineTimeline requires an id");
  }
  if (!(definition.duration > 0)) {
    throw new Error("defineTimeline requires a positive duration");
  }

  const cues = [...(definition.cues ?? [])].sort((a, b) => a.at - b.at);
  const ids = new Set<string>();
  for (const cue of cues) {
    if (!cue.id) {
      throw new Error("Timeline cues require an id");
    }
    if (ids.has(cue.id)) {
      throw new Error(`Duplicate timeline cue id: ${cue.id}`);
    }
    if (cue.at < 0 || cue.at > definition.duration) {
      throw new Error(
        `Cue "${cue.id}" at ${cue.at}s is outside duration ${definition.duration}s`,
      );
    }
    ids.add(cue.id);
  }

  return {
    ...definition,
    cues,
  };
}

export function buildCueMap(
  cues: TimelineCue[] | undefined,
): Map<string, TimelineCue> {
  const map = new Map<string, TimelineCue>();
  for (const cue of cues ?? []) {
    map.set(cue.id, cue);
  }
  return map;
}

export function getCueTime(
  cueMap: ReadonlyMap<string, TimelineCue>,
  cueId: string,
): Seconds | undefined {
  return cueMap.get(cueId)?.at;
}

export interface ResolvedTiming {
  at: Seconds;
  until: Seconds | undefined;
  duration: Seconds | undefined;
  delay: Seconds;
  activeAt: Seconds;
}

/**
 * Resolve `at` / `until` / cue ids into absolute times.
 * Cue ids win over raw seconds when both are provided.
 */
export function resolveTiming(
  props: TimingProps,
  cueMap: ReadonlyMap<string, TimelineCue>,
  demoDuration: Seconds,
): ResolvedTiming {
  const delay = props.delay ?? 0;
  const atFromCue = props.cue ? getCueTime(cueMap, props.cue) : undefined;
  const untilFromCue = props.untilCue
    ? getCueTime(cueMap, props.untilCue)
    : undefined;

  const at = (atFromCue ?? props.at ?? 0) + delay;
  let until = untilFromCue ?? props.until;

  if (until !== undefined && until < at) {
    until = at;
  }

  if (
    until === undefined &&
    props.duration !== undefined &&
    Number.isFinite(props.duration)
  ) {
    until = at + props.duration;
  }

  if (until !== undefined) {
    until = Math.min(until, demoDuration);
  }

  return {
    at: Math.max(0, at),
    until,
    duration: props.duration,
    delay,
    activeAt: Math.max(0, at),
  };
}

export function timingIsActive(
  time: Seconds,
  timing: ResolvedTiming,
): boolean {
  return isActiveWindow(time, timing.at, timing.until);
}

export function timingSegmentProgress(
  time: Seconds,
  timing: ResolvedTiming,
): number {
  return segmentProgress(time, timing.at, timing.until, timing.duration);
}

/** Look up a cue by id; throws a clear error when missing. */
export function requireCue(
  cueMap: ReadonlyMap<string, TimelineCue>,
  cueId: string,
): TimelineCue {
  const cue = cueMap.get(cueId);
  if (!cue) {
    throw new Error(`Unknown timeline cue: "${cueId}"`);
  }
  return cue;
}
