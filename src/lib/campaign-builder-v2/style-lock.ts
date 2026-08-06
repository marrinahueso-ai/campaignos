/** Durable "keep as-is" preference for Edit Post regenerations. */

const KEY_PREFIX = "campaign-builder-v2:style-lock:";

/** Prefixed into adjust/create instructions when the lock toggle is on. */
export const STYLE_LOCK_INSTRUCTION_PREFIX =
  "STYLE LOCK: Replicate the previous image exactly as-is. Change ONLY what the user lists next — do not alter colors, layout, composition, typography, subjects, or any other detail unless explicitly requested:";

export function styleLockStorageKey(
  eventId: string,
  milestoneId: string,
): string {
  return `${KEY_PREFIX}${eventId}:${milestoneId}`;
}

/** Default ON when artwork already exists so non-experts keep fidelity without retyping. */
export function readStyleLocked(
  eventId: string,
  milestoneId: string,
  defaultValue: boolean,
): boolean {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const raw = window.localStorage.getItem(
      styleLockStorageKey(eventId, milestoneId),
    );
    if (raw === null) {
      return defaultValue;
    }
    return raw === "1" || raw === "true";
  } catch {
    return defaultValue;
  }
}

export function writeStyleLocked(
  eventId: string,
  milestoneId: string,
  locked: boolean,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      styleLockStorageKey(eventId, milestoneId),
      locked ? "1" : "0",
    );
  } catch {
    // Ignore quota / private-mode failures — toggle still works in-session.
  }
}

export function applyStyleLockToInstructions(
  instructions: string,
  styleLocked: boolean,
): string {
  const trimmed = instructions.trim();
  if (!styleLocked || !trimmed) {
    return trimmed;
  }
  if (/style\s*lock:/i.test(trimmed)) {
    return trimmed;
  }
  return `${STYLE_LOCK_INSTRUCTION_PREFIX}\n${trimmed}`;
}

/** When locked, push the slider toward "More similar". */
export function resolveStyleStrengthForLock(
  styleStrength: number,
  styleLocked: boolean,
): number {
  if (!styleLocked) {
    return styleStrength;
  }
  return Math.max(styleStrength, 90);
}
