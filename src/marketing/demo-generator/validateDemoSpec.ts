import type {
  DemoBeat,
  DemoSpec,
  DemoSpecIssue,
  DemoSpecValidationResult,
} from "./types";

const KEBAB_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const PASCAL_FOLDER = /^[A-Z][A-Za-z0-9]+$/;

function error(path: string, message: string): DemoSpecIssue {
  return { path, message };
}

function warning(path: string, message: string): DemoSpecIssue {
  return { path, message };
}

function beatsOverlap(a: DemoBeat, b: DemoBeat): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Validate a DemoSpec. Returns errors (must fix) and warnings (should fix).
 */
export function validateDemoSpec(spec: DemoSpec): DemoSpecValidationResult {
  const errors: DemoSpecIssue[] = [];
  const warnings: DemoSpecIssue[] = [];

  if (!spec.id?.trim()) {
    errors.push(error("id", "Demo id is required."));
  } else if (!KEBAB_ID.test(spec.id)) {
    errors.push(
      error(
        "id",
        `Demo id "${spec.id}" must be kebab-case (e.g. "create-ai").`,
      ),
    );
  }

  if (!spec.folderName?.trim()) {
    errors.push(error("folderName", "folderName is required."));
  } else if (!PASCAL_FOLDER.test(spec.folderName)) {
    errors.push(
      error(
        "folderName",
        `folderName "${spec.folderName}" must be PascalCase (e.g. "CreateAI").`,
      ),
    );
  }

  if (!spec.name?.trim()) {
    errors.push(error("name", "Demo name is required."));
  }

  if (!spec.previewLabel?.trim()) {
    errors.push(error("previewLabel", "previewLabel is required for the harness."));
  }

  if (!spec.goal?.trim()) {
    errors.push(error("goal", "Demo goal must not be empty."));
  }

  if (!spec.description?.trim()) {
    warnings.push(warning("description", "Add a short description for authors."));
  }

  if (!spec.productArea?.trim()) {
    errors.push(error("productArea", "productArea is required."));
  }

  const { duration, allowBeatOverlap = false } = spec.playback ?? {
    duration: 0,
  };

  if (!(duration > 0)) {
    errors.push(error("playback.duration", "Duration must be a positive number."));
  } else if (duration < 12) {
    warnings.push(
      warning(
        "playback.duration",
        "Most demos work best at 18–28s; this duration is quite short.",
      ),
    );
  } else if (duration > 32) {
    warnings.push(
      warning(
        "playback.duration",
        "Prefer ≤28s unless the workflow clearly needs more time.",
      ),
    );
  }

  if (!spec.states?.startingState?.trim()) {
    errors.push(error("states.startingState", "Starting state is required."));
  }
  if (!spec.states?.finalState?.trim()) {
    errors.push(error("states.finalState", "Final state is required."));
  }
  if (!spec.states?.reducedMotionState?.trim()) {
    errors.push(
      error(
        "states.reducedMotionState",
        "Reduced-motion completed state is required.",
      ),
    );
  }

  if (!spec.responsive?.primaryStory?.length) {
    errors.push(
      error(
        "responsive.primaryStory",
        "List primaryStory elements that must stay visible on mobile.",
      ),
    );
  }

  if (!Array.isArray(spec.beats) || spec.beats.length === 0) {
    errors.push(error("beats", "At least one story beat is required."));
    return { ok: errors.length === 0, errors, warnings };
  }

  if (spec.beats.length > 7) {
    warnings.push(
      warning(
        "beats",
        "Prefer ≤7 major story beats for clarity (stagger helpers may use overlapOk).",
      ),
    );
  }

  const beatIds = new Set<string>();
  for (let i = 0; i < spec.beats.length; i += 1) {
    const beat = spec.beats[i];
    const base = `beats[${i}]`;

    if (!beat.id?.trim()) {
      errors.push(error(`${base}.id`, "Beat id is required."));
    } else if (!KEBAB_ID.test(beat.id)) {
      errors.push(
        error(`${base}.id`, `Beat id "${beat.id}" must be kebab-case.`),
      );
    } else if (beatIds.has(beat.id)) {
      errors.push(error(`${base}.id`, `Duplicate beat id: "${beat.id}".`));
    } else {
      beatIds.add(beat.id);
    }

    if (!beat.label?.trim()) {
      errors.push(error(`${base}.label`, "Beat label is required."));
    }
    if (!beat.description?.trim()) {
      errors.push(error(`${base}.description`, "Beat description is required."));
    }

    if (!(beat.start >= 0)) {
      errors.push(error(`${base}.start`, "Beat start must be ≥ 0."));
    }
    if (!(beat.end > beat.start)) {
      errors.push(
        error(`${base}.end`, "Beat end must be greater than beat start."),
      );
    }
    if (duration > 0 && beat.end > duration) {
      errors.push(
        error(
          `${base}.end`,
          `Beat "${beat.id}" ends at ${beat.end}s which exceeds duration ${duration}s.`,
        ),
      );
    }
    if (duration > 0 && beat.start > duration) {
      errors.push(
        error(
          `${base}.start`,
          `Beat "${beat.id}" starts after total duration.`,
        ),
      );
    }
  }

  if (!allowBeatOverlap) {
    for (let i = 0; i < spec.beats.length; i += 1) {
      for (let j = i + 1; j < spec.beats.length; j += 1) {
        const a = spec.beats[i];
        const b = spec.beats[j];
        if (a.overlapOk || b.overlapOk) continue;
        if (beatsOverlap(a, b)) {
          errors.push(
            error(
              `beats[${i}]`,
              `Beat "${a.id}" overlaps "${b.id}". Set playback.allowBeatOverlap or beat.overlapOk if intentional.`,
            ),
          );
        }
      }
    }
  }

  const sorted = [...spec.beats].sort((a, b) => a.start - b.start);
  if (sorted[0]?.start > 2.5) {
    warnings.push(
      warning(
        "beats",
        "Consider holding the starting state ~2–3s before the first action.",
      ),
    );
  }
  const last = sorted[sorted.length - 1];
  // Warn only when a short orphan gap sits after the last beat.
  // If last.end === duration, the final hold lives inside that beat (OK).
  const trailingGap = duration - (last?.end ?? duration);
  if (last && trailingGap > 0.05 && trailingGap < 2) {
    warnings.push(
      warning(
        "beats",
        "Hold the final result ~2s+ before looping for comprehension.",
      ),
    );
  } else if (last && last.end - last.start < 2 && trailingGap <= 0.05) {
    warnings.push(
      warning(
        "beats",
        "Final beat is shorter than ~2s — consider a longer completed-state hold.",
      ),
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation issues for console / authoring feedback.
 */
export function formatDemoSpecIssues(
  result: DemoSpecValidationResult,
): string {
  const lines: string[] = [];
  for (const issue of result.errors) {
    lines.push(`ERROR ${issue.path}: ${issue.message}`);
  }
  for (const issue of result.warnings) {
    lines.push(`WARN  ${issue.path}: ${issue.message}`);
  }
  return lines.join("\n");
}
