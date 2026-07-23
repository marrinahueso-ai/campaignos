import type { DemoSpec } from "./types";
import {
  formatDemoSpecIssues,
  validateDemoSpec,
} from "./validateDemoSpec";

export interface DefineDemoSpecOptions {
  /**
   * When true (default), throw on validation errors.
   * Set false for soft checks in exploratory authoring.
   */
  throwOnError?: boolean;
  /** When true, log warnings to the console in development. */
  logWarnings?: boolean;
}

/**
 * Define and validate a marketing DemoSpec.
 * Use this as the first implementation artifact for every new demo.
 */
export function defineDemoSpec(
  spec: DemoSpec,
  options: DefineDemoSpecOptions = {},
): DemoSpec {
  const { throwOnError = true, logWarnings = true } = options;
  const result = validateDemoSpec(spec);

  if (logWarnings && result.warnings.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `[demo-generator] Warnings for "${spec.id}":\n${formatDemoSpecIssues({
        ...result,
        errors: [],
      })}`,
    );
  }

  if (!result.ok && throwOnError) {
    throw new Error(
      `[demo-generator] Invalid DemoSpec "${spec.id ?? "(missing id)"}":\n${formatDemoSpecIssues(result)}`,
    );
  }

  return spec;
}
