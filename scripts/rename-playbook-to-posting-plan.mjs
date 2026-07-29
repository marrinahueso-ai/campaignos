#!/usr/bin/env node
/**
 * One-off: replace customer-facing "playbook" copy with "posting plan".
 * Skips import paths, identifiers (playbookId), URLs, data attributes, CSS classes.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TARGET_DIRS = [
  "src/components",
  "src/app",
  "src/lib/playbooks",
  "src/lib/campaign-builder-v2",
  "src/lib/communications-brain",
  "src/lib/ralli-assistant",
  "src/lib/calendar-import",
  "src/lib/ai",
  "src/lib/event-workspace",
  "docs/product/feature-list.md",
  "docs/qa/product-completion-master.md",
  "docs/qa/launch-checklist.md",
  "public",
];

const SKIP_PATH_PARTS = [
  "/__tests__/",
  "node_modules",
  ".next",
];

const EXACT_REPLACEMENTS = [
  ["Playbooks / Milestones", "Posting plans / Milestones"],
  ["Settings → Playbooks / Milestones", "Settings → Posting plans / Milestones"],
  ["Settings → Playbooks", "Settings → Posting plans"],
  ["Settings → Playbooks.", "Settings → Posting plans."],
  ["Create Playbook", "Create posting plan"],
  ["Create playbook", "Create posting plan"],
  ["Edit Playbook", "Edit posting plan"],
  ["Save Playbook", "Save posting plan"],
  ["Delete Playbook", "Delete posting plan"],
  ["Save as my playbook", "Save as my posting plan"],
  ["No playbooks yet", "No posting plans yet"],
  ["No playbooks available", "No posting plans available"],
  ["Playbook Name", "Posting plan name"],
  ["Playbooks in library", "Posting plans in library"],
  ["Playbook views", "Posting plan views"],
  ["Playbook mapped", "Posting plan mapped"],
  ["Playbook milestones mapped", "Posting plan milestones mapped"],
  ["Playbook Insights", "Posting plan insights"],
  ["Playbook mapped →", "Posting plan mapped →"],
  ["Default playbook", "Default posting plan"],
  ["Open library →", "Open library →"], // noop anchor
  ["Playbooks / Milestones settings", "Posting plans / Milestones settings"],
  ["Playbook change canceled — milestones unchanged.", "Posting plan change canceled — milestones unchanged."],
  ["Could not update playbook milestones.", "Could not update posting plan milestones."],
  ["Could not load playbook milestones.", "Could not load posting plan milestones."],
  ["Select a playbook.", "Select a posting plan."],
  ["Playbook name is required.", "Posting plan name is required."],
  ["Playbook not found.", "Posting plan not found."],
  ["Unable to create playbook.", "Unable to create posting plan."],
  ["Unable to duplicate playbook.", "Unable to duplicate posting plan."],
  ["Unable to assign playbook.", "Unable to assign posting plan."],
  ["Unable to update playbook.", "Unable to update posting plan."],
  ["Unable to delete playbook.", "Unable to delete posting plan."],
  ["Playbook created but milestones could not be saved.", "Posting plan created but milestones could not be saved."],
  ["Playbook details saved, but milestones could not be updated.", "Posting plan details saved, but milestones could not be updated."],
  ["Unable to archive playbook. System playbooks cannot be archived.", "Unable to archive posting plan. System posting plans cannot be archived."],
  ["This event strategy does not use a communication playbook.", "This event strategy does not use a communication posting plan."],
  ["Assign a live playbook to generate storable drafts.", "Assign a live posting plan to generate storable drafts."],
  ["Unable to generate draft. Assign a playbook with saved timeline steps first.", "Unable to generate draft. Assign a posting plan with saved timeline steps first."],
  ["Unable to update playbook.", "Unable to update posting plan."],
  ["Unable to map milestone to a playbook day.", "Unable to map milestone to a posting plan day."],
  ["Milestones suggested from your playbook and campaign date.", "Milestones suggested from your posting plan and campaign date."],
  ["Changing the playbook will update", "Changing the posting plan will update"],
  ["Customize playbook timing", "Customize posting plan timing"],
  ["Communication playbooks", "Communication posting plans"],
  ["communication playbooks", "communication posting plans"],
  ["Communication Playbooks", "Communication posting plans"],
  ["communication playbook", "communication posting plan"],
  ["Communication playbook", "Communication posting plan"],
  ["Communication Playbook", "Communication posting plan"],
  ["your playbook list", "your posting plan list"],
  ["organization's playbook list", "organization's posting plan list"],
  ["this playbook", "this posting plan"],
  ["the playbook", "the posting plan"],
  ["a playbook", "a posting plan"],
  ["your playbook", "your posting plan"],
  ["on playbooks", "on posting plans"],
  ["from playbook", "from posting plan"],
  ["from playbooks", "from posting plans"],
  ["Mapped from playbook", "Mapped from posting plan"],
  ["with the playbook", "with the posting plan"],
  ["into the playbook", "into the posting plan"],
  ["in the playbook", "in the posting plan"],
  ["playbook steps", "posting plan steps"],
  ["playbook tasks", "posting plan tasks"],
  ["playbook email", "posting plan email"],
  ["playbook day", "posting plan day"],
  ["playbook milestones", "posting plan milestones"],
  ["playbook timing", "posting plan timing"],
  ["playbook that maps", "posting plan that maps"],
  ["playbooks that map", "posting plans that map"],
  ["pick a playbook", "pick a posting plan"],
  ["choose a playbook", "choose a posting plan"],
  ["Choosing a playbook", "Choosing a posting plan"],
  ["Change playbook", "Change posting plan"],
  ["Assign a playbook", "Assign a posting plan"],
  ["assign a playbook", "assign a posting plan"],
  ["duplicate a playbook", "duplicate a posting plan"],
  ["Create new playbook", "Create new posting plan"],
  ["Create or duplicate a playbook", "Create or duplicate a posting plan"],
  ["create a playbook", "create a posting plan"],
  ["edit playbooks", "edit posting plans"],
  ["customizing playbooks", "customizing posting plans"],
  ["system playbook", "system posting plan"],
  ["System playbooks", "System posting plans"],
  ["system playbooks", "system posting plans"],
  ["org playbooks", "org posting plans"],
  ["org playbook", "org posting plan"],
  ["playbook list", "posting plan list"],
  ["playbook library", "posting plan library"],
  ["playbook copy", "posting plan copy"],
  ["playbook assignments", "posting plan assignments"],
  ["playbook assignment", "posting plan assignment"],
  ["playbook switch", "posting plan switch"],
  ["playbook ids", "posting plan ids"],
  ["playbook id", "posting plan id"],
  ["playbook-insights", "posting plan insights"], // careful - might be wrong
  ["inspiration & playbook", "inspiration & posting plan"],
  ["inspiration · playbook", "inspiration · posting plan"],
  ["Logos · inspiration · playbook", "Logos · inspiration · posting plan"],
  ["Logos, inspiration & playbook", "Logos, inspiration & posting plan"],
  ["Logos · DnD · playbook", "Logos · DnD · posting plan"],
  ["Logos, inspiration, and a playbook", "Logos, inspiration, and a posting plan"],
  ["Brand logos from Setup, inspiration, and a playbook that maps", "Brand logos from Setup, inspiration, and a posting plan that maps"],
  ["Brand logos from Setup, drag inspiration into order, pick a playbook that maps your milestone plan.", "Brand logos from Setup, drag inspiration into order, pick a posting plan that maps your milestone plan."],
  ["Playbook maps to", "Posting plan maps to"],
  ["playbook and communication strategy. Playbooks come from", "posting plan and communication strategy. Posting plans come from"],
  ["Choose a playbook and communication strategy. Playbooks come from your Settings templates (including custom milestones).", "Choose a posting plan and communication strategy. Posting plans come from your Settings templates (including custom milestones)."],
  ["No playbook,", "No posting plan,"],
  ["Start a plan — milestones arrive with the playbook.", "Start a plan — milestones arrive with the posting plan."],
  ["Your playbook can generate a checklist when you're ready.", "Your posting plan can generate a checklist when you're ready."],
  ["Artwork, captions, and playbooks that sound like your school", "Artwork, captions, and posting plans that sound like your school"],
  ["Voice, inbox sources, playbooks, brand kit", "Voice, inbox sources, posting plans, brand kit"],
  ["Colors, logos, AI voice, inbox sources, playbooks, and school year", "Colors, logos, AI voice, inbox sources, posting plans, and school year"],
  ["sources, playbooks, brand kit", "sources, posting plans, brand kit"],
  ["AI Brain · AI Inbox · Playbook · Colors", "AI Brain · AI Inbox · Posting plan · Colors"],
  ["AI Brain, AI Inbox, Playbook, brand kit", "AI Brain, AI Inbox, Posting plan, brand kit"],
  ["templates live on playbooks", "templates live on posting plans"],
  ["1 playbook", "1 posting plan"],
  ["6 playbooks", "6 posting plans"],
  ["When to use this playbook...", "When to use this posting plan..."],
  ["Remove this step from this playbook?", "Remove this step from this posting plan?"],
  ["School Event – 6 Week Playbook", "School Event – 6 Week Posting Plan"],
  ["Fundraiser – 4 Week Playbook", "Fundraiser – 4 Week Posting Plan"],
  ["Community Event – 2 Week Playbook", "Community Event – 2 Week Posting Plan"],
  ["Plan types come from Settings → Playbooks.", "Plan types come from Settings → Posting plans."],
  ["Download a copy of your organization data, playbooks, and settings.", "Download a copy of your organization data, posting plans, and settings."],
  ["Sync playbook tasks with a Monday board.", "Sync posting plan tasks with a Monday board."],
  ["for playbook checklists", "for posting plan checklists"],
  ["No communication playbook steps found", "No communication posting plan steps found"],
  ["Planning tables are not available yet. Run the event playbook migration.", "Planning tables are not available yet. Run the event posting plan migration."],
  ["Add the event name, date, and choose a playbook so milestones are ready.", "Add the event name, date, and choose a posting plan so milestones are ready."],
  ["Playbook:", "Posting plan:"],
  ["## Playbooks", "## Posting plans"],
  ["Campaign/Playbook templates", "Campaign/posting plan templates"],
  ["Playbooks | Wired", "Posting plans | Wired"],
  ["Playbooks, Colors", "Posting plans, Colors"],
  ["Playbooks / Milestones", "Posting plans / Milestones"],
  ["Inbox / Playbooks / Colors", "Inbox / Posting plans / Colors"],
  ["PTO playbook tips", "PTO posting plan tips"], // might be internal - skip
];

// Title case labels — apply after body replacements to avoid double-replace issues
const TITLE_REPLACEMENTS = [
  [/\bPlaybooks\b/g, "Posting plans"],
  [/\bPlaybook\b/g, "Posting plan"],
];

function shouldSkip(filePath) {
  return SKIP_PATH_PARTS.some((part) => filePath.includes(part));
}

function collectFiles(entry) {
  const full = join(ROOT, entry);
  try {
    const st = statSync(full);
    if (st.isFile()) {
      const ext = extname(full);
      if ([".tsx", ".ts", ".md", ".html"].includes(ext)) return [full];
      return [];
    }
  } catch {
    return [];
  }
  const out = [];
  for (const name of readdirSync(full)) {
    out.push(...collectFiles(join(entry, name)));
  }
  return out;
}

function transform(content, filePath) {
  let next = content;
  for (const [from, to] of EXACT_REPLACEMENTS) {
    if (from === to) continue;
    next = next.split(from).join(to);
  }

  // Title-case sweep only in customer-facing paths (not tests unless asserting copy)
  const isTest = filePath.includes("/__tests__/");
  const isInternalIdFile =
    filePath.endsWith("types/playbooks.ts") ||
    filePath.endsWith("types/event-playbooks.ts");

  if (!isInternalIdFile && !isTest) {
    // Avoid replacing in import paths and URLs
    next = next.replace(
      /(?<!\/settings\/playbooks)(?<!playbookId)(?<!milestonesPlaybookId)(?<!data-settings-ease="playbook")(?<!section=playbook)(?<!kind="playbook")(?<!\/playbooks\/)(?<![a-zA-Z_])Playbooks(?![a-zA-Z_])/g,
      "Posting plans",
    );
    next = next.replace(
      /(?<!\/settings\/playbooks)(?<!playbookId)(?<!milestonesPlaybookId)(?<!data-settings-ease="playbook")(?<!section=playbook)(?<!kind="playbook")(?<!\/playbooks\/)(?<![a-zA-Z_])Playbook(?![a-zA-Z_])/g,
      "Posting plan",
    );
  }

  // Fix plural counts like `${data.playbookCount} playbooks`
  next = next.replace(/\$\{([^}]+)\} playbooks/g, "${$1} posting plans");
  next = next.replace(/playbooks`/g, "posting plans`");
  next = next.replace(/playbooks"/g, 'posting plans"');
  next = next.replace(/playbooks'/g, "posting plans'");

  return next;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  for (const file of collectFiles(dir)) {
    if (shouldSkip(file)) continue;
    const before = readFileSync(file, "utf8");
    const after = transform(before, file);
    if (after !== before) {
      writeFileSync(file, after, "utf8");
      changed++;
      console.log("updated:", file.replace(ROOT + "/", ""));
    }
  }
}
console.log(`\nDone. ${changed} files updated.`);
