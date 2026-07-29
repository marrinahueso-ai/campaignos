#!/usr/bin/env node
/**
 * Customer-facing copy: playbook/posting plan → Communication Plan; milestone → Post(s).
 * Preserves internal IDs, routes, imports, and schema names.
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
  "src/lib/settings-v2",
  "src/lib/events",
  "src/lib/events-phase3",
  "src/lib/today",
  "src/lib/vendors",
  "src/lib/onboarding",
  "src/lib/task-hub",
  "src/lib/tasks-v2",
  "src/lib/approvals-scheduling",
  "src/lib/memory",
  "src/lib/homepage-composer",
  "src/lib/newsletter-composer",
  "src/lib/volunteer-composer",
  "src/marketing",
  "docs/product/feature-list.md",
  "docs/qa/product-completion-master.md",
  "docs/qa/launch-checklist.md",
  "public",
  "tests/hey-ralli",
];

const SKIP_PATH_PARTS = ["node_modules", ".next"];

/** Fix syntax damage from aborted posting-plan rename (internals). */
const DAMAGE_FIXES = [
  ["hasPosting plan:", "hasPlaybook:"],
  ['href: "/settings/posting plans"', 'href: "/settings/playbooks-milestones"'],
  ['href="/settings/posting plans"', 'href="/settings/playbooks-milestones"'],
  ['pathname.startsWith("/settings/posting plans")', 'pathname.startsWith("/settings/playbooks-milestones")'],
  ['revalidatePath("/settings/posting plans")', 'revalidatePath("/settings/playbooks-milestones")'],
  ['id: "edit_posting plans"', 'id: "edit_playbooks"'],
  ['label: "Edit posting plans"', 'label: "Edit communication plans"'],
];

/** Longest-first exact string replacements (customer-facing). */
const EXACT_REPLACEMENTS = [
  // Broken posting-plan leftovers → Communication Plan
  ["Communication posting plans", "Communication Plans"],
  ["communication posting plans", "communication plans"],
  ["Communication posting plan", "Communication Plan"],
  ["communication posting plan", "communication plan"],
  ["Posting plans / Milestones", "Communication Plans / Posts"],
  ["Settings → Posting plans / Milestones", "Settings → Communication Plans / Posts"],
  ["Settings → Posting plans", "Settings → Communication Plans"],
  ["Settings → Posting plans.", "Settings → Communication Plans."],
  ["Posting plan milestones mapped", "Communication Plan posts mapped"],
  ["posting plan milestones", "communication plan posts"],
  ["Posting plan mapped →", "Communication Plan mapped →"],
  ["Posting plan mapped", "Communication Plan mapped"],
  ["posting plan steps", "communication plan posts"],
  ["posting plan tasks", "communication plan tasks"],
  ["posting plan email", "communication plan email"],
  ["posting plan day", "communication plan day"],
  ["posting plan timing", "communication plan timing"],
  ["posting plan that maps", "communication plan that maps"],
  ["posting plans that map", "communication plans that map"],
  ["posting plan list", "communication plan list"],
  ["posting plan library", "communication plan library"],
  ["posting plan copy", "communication plan copy"],
  ["posting plan assignments", "communication plan assignments"],
  ["posting plan assignment", "communication plan assignment"],
  ["posting plan switch", "communication plan switch"],
  ["posting plan ids", "communication plan ids"],
  ["posting plan id", "communication plan id"],
  ["posting plan insights", "communication plan insights"],
  ["event posting plan migration", "event communication plan migration"],
  ["system posting plans", "system communication plans"],
  ["System posting plans", "System communication plans"],
  ["system posting plan", "system communication plan"],
  ["org posting plans", "org communication plans"],
  ["org posting plan", "org communication plan"],
  ["No posting plans yet", "No communication plans yet"],
  ["No posting plans available", "No communication plans available"],
  ["Create posting plan", "Create communication plan"],
  ["Edit posting plan", "Edit communication plan"],
  ["Save posting plan", "Save communication plan"],
  ["Delete posting plan", "Delete communication plan"],
  ["Save as my posting plan", "Save as my communication plan"],
  ["Posting plan name", "Communication plan name"],
  ["Posting plan views", "Communication plan views"],
  ["Default posting plan", "Default communication plan"],
  ["Posting plan not found.", "Communication plan not found."],
  ["Posting plan name is required.", "Communication plan name is required."],
  ["Posting plan created but milestones could not be saved.", "Communication plan created but posts could not be saved."],
  ["Posting plan details saved, but milestones could not be updated.", "Communication plan details saved, but posts could not be updated."],
  ["Posting plan change canceled — milestones unchanged.", "Communication plan change canceled — posts unchanged."],
  ["Could not update posting plan milestones.", "Could not update communication plan posts."],
  ["Could not load posting plan milestones.", "Could not load communication plan posts."],
  ["Unable to create posting plan.", "Unable to create communication plan."],
  ["Unable to duplicate posting plan.", "Unable to duplicate communication plan."],
  ["Unable to assign posting plan.", "Unable to assign communication plan."],
  ["Unable to update posting plan.", "Unable to update communication plan."],
  ["Unable to delete posting plan.", "Unable to delete communication plan."],
  ["Unable to archive posting plan.", "Unable to archive communication plan."],
  ["Only system posting plans can be removed from your list this way.", "Only system communication plans can be removed from your list this way."],
  ["System posting plans cannot be deleted.", "System communication plans cannot be deleted."],
  ["Unable to save milestones on the new posting plan copy.", "Unable to save posts on the new communication plan copy."],
  ["Complete School Setup before customizing posting plans.", "Complete School Setup before customizing communication plans."],
  ["Unable to update posting plan. You can only edit posting plans owned by your organization.", "Unable to update communication plan. You can only edit communication plans owned by your organization."],
  ["Unable to archive posting plan. System posting plans cannot be archived.", "Unable to archive communication plan. System communication plans cannot be archived."],
  ["This event strategy does not use a communication posting plan.", "This event strategy does not use a communication plan."],
  ["No communication posting plan assigned.", "No communication plan assigned."],
  ["No communication posting plan steps found", "No communication plan posts found"],
  ["Assign a communication posting plan to see", "Assign a communication plan to see"],
  ["This timeline mirrors your communication posting plan", "This timeline mirrors your communication plan"],
  ["When to use this posting plan...", "When to use this communication plan..."],
  ["Remove this step from this posting plan?", "Remove this post from this communication plan?"],
  ["Posting plan tasks from active campaigns", "Communication plan tasks from active campaigns"],
  ["Posting plan:", "Communication plan:"],
  ["Posting plan", "Communication Plan"],
  ["posting plans", "communication plans"],
  ["posting plan", "communication plan"],

  // Playbook leftovers → Communication Plan
  ["Playbooks / Milestones", "Communication Plans / Posts"],
  ["Settings → Playbooks / Milestones", "Settings → Communication Plans / Posts"],
  ["Settings → Playbooks", "Settings → Communication Plans"],
  ["Communication playbooks", "Communication Plans"],
  ["communication playbooks", "communication plans"],
  ["Communication Playbooks", "Communication Plans"],
  ["communication playbook", "communication plan"],
  ["Communication playbook", "Communication Plan"],
  ["Communication Playbook", "Communication Plan"],
  ["Playbook milestones mapped", "Communication Plan posts mapped"],
  ["playbook milestones", "communication plan posts"],
  ["Playbook mapped →", "Communication Plan mapped →"],
  ["Playbook mapped", "Communication Plan mapped"],
  ["playbook steps", "communication plan posts"],
  ["playbook tasks", "communication plan tasks"],
  ["playbook timing", "communication plan timing"],
  ["playbook that maps", "communication plan that maps"],
  ["playbooks that map", "communication plans that map"],
  ["playbook list", "communication plan list"],
  ["system playbooks", "system communication plans"],
  ["System playbooks", "System communication plans"],
  ["system playbook", "system communication plan"],
  ["No playbooks yet", "No communication plans yet"],
  ["No playbooks available", "No communication plans available"],
  ["Create Playbook", "Create communication plan"],
  ["Create playbook", "Create communication plan"],
  ["Edit Playbook", "Edit communication plan"],
  ["Save Playbook", "Save communication plan"],
  ["Delete Playbook", "Delete communication plan"],
  ["Save as my playbook", "Save as my communication plan"],
  ["Playbook Name", "Communication plan name"],
  ["Playbook views", "Communication plan views"],
  ["Default playbook", "Default communication plan"],
  ["Playbook not found.", "Communication plan not found."],
  ["Playbook name is required.", "Communication plan name is required."],
  ["Playbook created but milestones could not be saved.", "Communication plan created but posts could not be saved."],
  ["Playbook details saved, but milestones could not be updated.", "Communication plan details saved, but posts could not be updated."],
  ["Playbook change canceled — milestones unchanged.", "Communication plan change canceled — posts unchanged."],
  ["Could not update playbook milestones.", "Could not update communication plan posts."],
  ["Could not load playbook milestones.", "Could not load communication plan posts."],
  ["Unable to create playbook.", "Unable to create communication plan."],
  ["Unable to duplicate playbook.", "Unable to duplicate communication plan."],
  ["Unable to assign playbook.", "Unable to assign communication plan."],
  ["Unable to update playbook.", "Unable to update communication plan."],
  ["Unable to delete playbook.", "Unable to delete communication plan."],
  ["Unable to archive playbook.", "Unable to archive communication plan."],
  ["This event strategy does not use a communication playbook.", "This event strategy does not use a communication plan."],
  ["No communication playbook assigned.", "No communication plan assigned."],
  ["No communication playbook steps found", "No communication plan posts found"],
  ["Assign a communication playbook to see", "Assign a communication plan to see"],
  ["Assign a live playbook to generate", "Assign a live communication plan to generate"],
  ["Assign a playbook with saved timeline steps", "Assign a communication plan with saved posts"],
  ["Unable to generate draft. Assign a playbook", "Unable to generate draft. Assign a communication plan"],
  ["Changing the playbook will update", "Changing the communication plan will update"],
  ["Customize playbook timing", "Customize communication plan timing"],
  ["When to use this playbook...", "When to use this communication plan..."],
  ["Remove this step from this playbook?", "Remove this post from this communication plan?"],
  ["Playbook tasks from active campaigns", "Communication plan tasks from active campaigns"],
  ["Playbook:", "Communication plan:"],
  ["Plan types come from Settings → Playbooks.", "Plan types come from Settings → Communication Plans."],
  ["Download a copy of your organization data, playbooks, and settings.", "Download a copy of your organization data, communication plans, and settings."],
  ["Sync playbook tasks with a Monday board.", "Sync communication plan tasks with a Monday board."],
  ["for playbook checklists", "for communication plan checklists"],
  ["Planning tables are not available yet. Run the event playbook migration.", "Planning tables are not available yet. Run the event communication plan migration."],
  ["Add the event name, date, and choose a playbook so milestones are ready.", "Add the event name, date, and choose a communication plan so posts are ready."],
  ["Choose a playbook and communication strategy. Playbooks come from your Settings templates (including custom milestones).", "Choose a communication plan and communication strategy. Communication plans come from your Settings templates (including custom posts)."],
  ["playbook and communication strategy. Playbooks come from", "communication plan and communication strategy. Communication plans come from"],
  ["Start a plan — milestones arrive with the playbook.", "Start a plan — posts arrive with the communication plan."],
  ["Your playbook can generate a checklist when you're ready.", "Your communication plan can generate a checklist when you're ready."],
  ["Artwork, captions, and playbooks that sound like your school", "Artwork, captions, and communication plans that sound like your school"],
  ["Voice, inbox sources, playbooks, brand kit", "Voice, inbox sources, communication plans, brand kit"],
  ["Colors, logos, AI voice, inbox sources, playbooks, and school year", "Colors, logos, AI voice, inbox sources, communication plans, and school year"],
  ["sources, playbooks, brand kit", "sources, communication plans, brand kit"],
  ["AI Brain · AI Inbox · Playbook · Colors", "AI Brain · AI Inbox · Communication Plan · Colors"],
  ["AI Brain, AI Inbox, Playbook, brand kit", "AI Brain, AI Inbox, Communication Plan, brand kit"],
  ["templates live on playbooks", "templates live on communication plans"],
  ["1 playbook", "1 communication plan"],
  ["6 playbooks", "6 communication plans"],
  ["School Event – 6 Week Playbook", "School Event – 6 Week Communication Plan"],
  ["Fundraiser – 4 Week Playbook", "Fundraiser – 4 Week Communication Plan"],
  ["Community Event – 2 Week Playbook", "Community Event – 2 Week Communication Plan"],
  ["Campaign/Playbook templates", "Campaign/communication plan templates"],
  ["Playbooks | Wired", "Communication Plans | Wired"],
  ["Playbooks, Colors", "Communication Plans, Colors"],
  ["Inbox / Playbooks / Colors", "Inbox / Communication Plans / Colors"],
  ["inspiration & playbook", "inspiration & communication plan"],
  ["inspiration · playbook", "inspiration · communication plan"],
  ["Logos · inspiration · playbook", "Logos · inspiration · communication plan"],
  ["Logos, inspiration & playbook", "Logos, inspiration & communication plan"],
  ["Logos · DnD · playbook", "Logos · DnD · communication plan"],
  ["from playbook", "from communication plan"],
  ["from playbooks", "from communication plans"],
  ["Mapped from playbook", "Mapped from communication plan"],
  ["pick a playbook", "pick a communication plan"],
  ["choose a playbook", "choose a communication plan"],
  ["Choosing a playbook", "Choosing a communication plan"],
  ["Change playbook", "Change communication plan"],
  ["Assign a playbook", "Assign a communication plan"],
  ["assign a playbook", "assign a communication plan"],
  ["duplicate a playbook", "duplicate a communication plan"],
  ["Create new playbook", "Create new communication plan"],
  ["Create or duplicate a playbook", "Create or duplicate a communication plan"],
  ["create a playbook", "create a communication plan"],
  ["edit playbooks", "edit communication plans"],
  ["customizing playbooks", "customizing communication plans"],
  ["your playbook list", "your communication plan list"],
  ["organization's playbook list", "organization's communication plan list"],
  ["this playbook", "this communication plan"],
  ["the playbook", "the communication plan"],
  ["a playbook", "a communication plan"],
  ["your playbook", "your communication plan"],
  ["on playbooks", "on communication plans"],
  ["with the playbook", "with the communication plan"],
  ["into the playbook", "into the communication plan"],
  ["in the playbook", "in the communication plan"],
  ["Manage Posting plans", "Manage communication plans"],
  ["Communication posting plans", "Communication Plans"],

  // Milestone → Post(s) — campaign/communication context
  ["Milestones suggested from your communication plan and campaign date.", "Posts suggested from your communication plan and campaign date."],
  ["Milestones suggested from your posting plan and campaign date.", "Posts suggested from your communication plan and campaign date."],
  ["Unable to map milestone to a communication plan day.", "Unable to map post to a communication plan day."],
  ["Unable to map milestone to a posting plan day.", "Unable to map post to a communication plan day."],
  ["Milestone templates are managed inside each campaign.", "Post templates are managed inside each campaign."],
  ["to edit milestone schedules, or create a communication plan above", "to edit post schedules, or create a communication plan above"],
  ["to edit milestone schedules, or create a posting plan above", "to edit post schedules, or create a communication plan above"],
  ["including custom milestones", "including custom posts"],
  ["including custom posts)", "including custom posts)"], // noop
  ["Milestone planning", "Posts"],
  ["Milestone Progress", "Post progress"],
  ["Upcoming Milestones", "Upcoming posts"],
  ["Edit milestone", "Edit post"],
  ["Milestone name", "Post name"],
  ["New Milestone", "New post"],
  ["Describe the purpose of this milestone", "Describe the purpose of this post"],
  ["No milestones are ready to schedule yet.", "No posts are ready to schedule yet."],
  ["This milestone has already been published.", "This post has already been published."],
  ["No Meta milestones for this event.", "No Meta posts for this event."],
  ["Generation is already in progress for this milestone.", "Generation is already in progress for this post."],
  ["Select a milestone to generate content.", "Select a post to generate content."],
  ["All milestones already have generated content.", "All posts already have generated content."],
  ["for this milestone", "for this post"],
  ["for ${milestone?.name ?? \"this milestone\"}", "for ${milestone?.name ?? \"this post\"}"],
  ["Milestone ID is required.", "Post ID is required."],
  ["Milestones, artwork, captions, approval for this event.", "Posts, artwork, captions, approval for this event."],
  ["that map milestones", "that map posts"],
  ["your milestone plan", "your post plan"],
  ["milestone plan", "post plan"],
  ["milestone schedules", "post schedules"],
  ["milestone steps", "posts"],
  ["countdown steps", "countdown posts"],
  ["default countdown steps", "default countdown posts"],
  ["saved timeline steps", "saved posts"],
  ["Milestone Empty", "Post empty"], // component title fragments
  ["milestone-empty", "post-empty"], // careful - might be CSS
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
      if ([".tsx", ".ts", ".md", ".html", ".spec.ts"].includes(ext)) return [full];
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

function isProtectedContext(text, index) {
  const before = text.slice(Math.max(0, index - 80), index);
  const after = text.slice(index, index + 80);
  // Skip import paths, URLs, identifiers
  if (/\/playbooks/.test(before) && /["'`]/.test(before.slice(-1))) return true;
  if (/playbookId|milestoneId|milestonesPlaybookId|meta_milestone|clear_milestone/.test(before + after)) return true;
  if (/from ["']@\/types\/playbooks/.test(before + after)) return true;
  if (/from ["']@\/lib\/playbooks/.test(before + after)) return true;
  if (/data-settings-ease=["']playbook/.test(before + after)) return true;
  if (/section=playbook/.test(before + after)) return true;
  if (/kind=["']playbook/.test(before + after)) return true;
  if (/id: ["']playbooks["']/.test(before + after)) return true;
  if (/activeTab === ["']playbooks["']/.test(before + after)) return true;
  if (/TabId = ["']playbooks/.test(before + after)) return true;
  if (/currentStep: ["']milestones["']/.test(before + after)) return true;
  if (/setCurrentStep\(["']milestones["']\)/.test(before + after)) return true;
  if (/setLocationHash\(["']milestones["']\)/.test(before + after)) return true;
  if (/milestone-editor-form/.test(before + after)) return true;
  if (/generateMilestoneContent/.test(before + after)) return true;
  if (/milestoneName:/.test(before + after)) return true;
  if (/campaignMilestoneId/.test(before + after)) return true;
  if (/milestone-status/.test(before + after)) return true;
  if (/playbook-milestones/.test(before + after)) return true;
  if (/MilestoneEditorModal|MilestoneRail|MilestonesStep|MilestoneEmptyState/.test(before + after)) return true;
  if (/scheduled-milestones/.test(before + after)) return true;
  if (/resolve-milestone-artwork/.test(before + after)) return true;
  if (/publish-milestone/.test(before + after)) return true;
  if (/suggest-milestones/.test(before + after)) return true;
  if (/milestone-planning/.test(before + after)) return true;
  if (/milestoneHasArtwork/.test(before + after)) return true;
  if (/findMetaPublishBundleForDay/.test(before + after)) return true;
  if (/edit_playbooks/.test(before + after)) return true;
  return false;
}

function transform(content, filePath) {
  let next = content;

  for (const [from, to] of DAMAGE_FIXES) {
    next = next.split(from).join(to);
  }

  for (const [from, to] of EXACT_REPLACEMENTS) {
    if (from === to) continue;
    next = next.split(from).join(to);
  }

  const isInternalIdFile =
    filePath.endsWith("types/playbooks.ts") ||
    filePath.endsWith("types/event-playbooks.ts");

  if (!isInternalIdFile) {
    // Title-case nav labels (avoid protected contexts via simple heuristics in strings only)
    next = next.replace(/"Playbooks"/g, '"Communication Plans"');
    next = next.replace(/"Playbook"/g, '"Communication Plan"');
    next = next.replace(/"Milestones"/g, '"Posts"');
    next = next.replace(/"Milestone"/g, '"Post"');
    next = next.replace(/title="Playbook"/g, 'title="Communication Plan"');
    next = next.replace(/title="Playbooks"/g, 'title="Communication Plans"');
    next = next.replace(/title="Milestones"/g, 'title="Posts"');
    next = next.replace(/label: "Playbooks"/g, 'label: "Communication Plans"');
    next = next.replace(/label: "Playbook"/g, 'label: "Communication Plan"');
    next = next.replace(/label: "Milestones"/g, 'label: "Posts"');
    next = next.replace(/label: "Milestone"/g, 'label: "Post"');
    next = next.replace(/>\s*Playbooks\s*</g, ">Communication Plans<");
    next = next.replace(/>\s*Playbook\s*</g, ">Communication Plan<");
    next = next.replace(/>\s*Milestones\s*</g, ">Posts<");
    next = next.replace(/\$\{([^}]+)\} playbooks/g, "${$1} communication plans");
    next = next.replace(/\$\{([^}]+)\} posting plans/g, "${$1} communication plans");
  }

  // Fix title-case mid-sentence errors from sweeps
  next = next.replace(/Communication Plan name/g, "Communication plan name");
  next = next.replace(/Create Communication Plan/g, "Create communication plan");
  next = next.replace(/Edit Communication Plan/g, "Edit communication plan");
  next = next.replace(/Save Communication Plan/g, "Save communication plan");
  next = next.replace(/Delete Communication Plan/g, "Delete communication plan");
  next = next.replace(/Save as my Communication Plan/g, "Save as my communication plan");
  next = next.replace(/a Communication Plan/g, "a communication plan");
  next = next.replace(/the Communication Plan/g, "the communication plan");
  next = next.replace(/this Communication Plan/g, "this communication plan");
  next = next.replace(/your Communication Plan/g, "your communication plan");
  next = next.replace(/No Communication Plans yet/g, "No communication plans yet");
  next = next.replace(/No Communication Plans available/g, "No communication plans available");
  next = next.replace(/Manage Communication Plans/g, "Manage communication plans");
  next = next.replace(/Unable to create Communication Plan\./g, "Unable to create communication plan.");
  next = next.replace(/Unable to update Communication Plan\./g, "Unable to update communication plan.");
  next = next.replace(/Unable to delete Communication Plan\./g, "Unable to delete communication plan.");
  next = next.replace(/Unable to duplicate Communication Plan\./g, "Unable to duplicate communication plan.");
  next = next.replace(/Unable to assign Communication Plan\./g, "Unable to assign communication plan.");
  next = next.replace(/Communication Plan not found\./g, "Communication plan not found.");
  next = next.replace(/Communication Plan name is required\./g, "Communication plan name is required.");

  // Nav/section titles keep title case
  next = next.replace(/title="Communication plan"/g, 'title="Communication Plan"');
  next = next.replace(/title="Communication plans"/g, 'title="Communication Plans"');
  next = next.replace(/label: "Communication plans"/g, 'label: "Communication Plans"');
  next = next.replace(/← Back to Communication plans/g, "← Back to Communication Plans");
  next = next.replace(/Back to Communication plans/g, "Back to Communication Plans");
  next = next.replace(/Settings → Communication plans/g, "Settings → Communication Plans");

  // Avoid "a Posts"
  next = next.replace(/a Posts\b/g, "a post");
  next = next.replace(/A Posts\b/g, "A post");

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
