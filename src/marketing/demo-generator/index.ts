/**
 * Hey Ralli Marketing Demo Generator — authoring contract for Cursor.
 * Specs + validation only. Registry lives in `./demoRegistry` (client).
 */

export type {
  DemoId,
  DemoBeat,
  DemoPlayback,
  DemoStates,
  DemoContent,
  DemoResponsive,
  DemoAccessibility,
  DemoSpec,
  DemoSpecIssue,
  DemoSpecValidationResult,
  DemoRegistryEntry,
  EnginePrimitiveName,
} from "./types";

export { defineDemoSpec } from "./defineDemoSpec";
export type { DefineDemoSpecOptions } from "./defineDemoSpec";

export {
  validateDemoSpec,
  formatDemoSpecIssues,
} from "./validateDemoSpec";

export {
  deriveDemoNames,
  demoFolderContract,
  DEMO_FOLDER_CONTRACT_DOC,
} from "./demoTemplate";
export type { DemoScaffoldNames } from "./demoTemplate";
