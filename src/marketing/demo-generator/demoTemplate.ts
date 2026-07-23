/**
 * Documentation-oriented scaffolding helpers for Cursor authoring.
 * These are string templates — not a runtime code generator / CLI.
 */

export interface DemoScaffoldNames {
  /** PascalCase folder, e.g. CreateAI */
  folderName: string;
  /** camelCase prefix, e.g. createAI */
  camelName: string;
  /** kebab-case id, e.g. create-ai */
  id: string;
  /** Display name, e.g. Create with AI */
  displayName: string;
}

/** Derive common names from a PascalCase folder name. */
export function deriveDemoNames(folderName: string): DemoScaffoldNames {
  if (!/^[A-Z][A-Za-z0-9]+$/.test(folderName)) {
    throw new Error(
      `folderName must be PascalCase (got "${folderName}"). Example: VolunteerIntelligence`,
    );
  }
  const camelName = folderName[0].toLowerCase() + folderName.slice(1);
  const id = folderName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

  return {
    folderName,
    camelName,
    id,
    displayName: folderName.replace(/([a-z])([A-Z])/g, "$1 $2"),
  };
}

/** Required relative paths for a new demo folder. */
export function demoFolderContract(folderName: string): string[] {
  const { camelName } = deriveDemoNames(folderName);
  return [
    `src/marketing/demos/${folderName}/${folderName}Demo.tsx`,
    `src/marketing/demos/${folderName}/${camelName}Spec.ts`,
    `src/marketing/demos/${folderName}/${camelName}Timeline.ts`,
    `src/marketing/demos/${folderName}/demoData.ts`,
    `src/marketing/demos/${folderName}/index.ts`,
    `src/marketing/demos/${folderName}/README.md`,
    `src/marketing/demos/${folderName}/components/`,
  ];
}

export const DEMO_FOLDER_CONTRACT_DOC = `
src/marketing/demos/[DemoName]/
  [DemoName]Demo.tsx       # Root DemoPlayer composition
  [demoName]Spec.ts        # defineDemoSpec(...)
  [demoName]Timeline.ts    # defineTimeline(...)
  demoData.ts              # Centralized static copy / fixtures
  index.ts                 # Named + default exports
  README.md                # Author notes + preview URL
  components/              # Only components this demo needs
`.trim();
