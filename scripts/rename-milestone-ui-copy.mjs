#!/usr/bin/env node
/** Second pass: milestone/playbook UI strings → Post(s) / communication plan */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DIRS = [
  "src/components/campaign-builder-v2",
  "src/components/event-workspace",
  "src/components/event-playbooks",
  "src/components/playbooks",
  "src/components/settings-v2",
  "src/components/artwork-v2",
  "src/components/events-phase3",
  "src/components/approvals-scheduling",
  "src/components/communications-planning-calendar",
  "src/components/create-with-ai",
  "src/components/today",
  "src/lib/ralli-assistant/product-help-knowledge.ts",
  "src/lib/meta-publishing/bundle-display.ts",
  "src/lib/meta-publishing/send-story-post-kit.ts",
  "src/lib/dev-tools",
  "src/lib/campaign-builder-v2/health.ts",
  "src/lib/campaign-builder-v2/navigation.ts",
  "src/lib/campaign-builder-v2/playbook-milestones.ts",
  "src/lib/events-phase3",
  "src/lib/today",
  "src/lib/approvals-scheduling",
  "public",
  "tests/hey-ralli",
];

const REPLACEMENTS = [
  ["Logos, inspiration &amp; playbook", "Logos, inspiration &amp; communication plan"],
  ["Logos, inspiration & playbook", "Logos, inspiration & communication plan"],
  ["Logos · inspiration · playbook", "Logos · inspiration · communication plan"],
  ["2 · Milestones", "2 · Posts"],
  ["Save → Milestones", "Save → Posts"],
  ["← Milestones", "← Posts"],
  ["Campaign Milestones", "Posts"],
  ["Milestones reordered", "Posts reordered"],
  ["Milestone saved", "Post saved"],
  ["Milestone added", "Post added"],
  ["+ Add milestone", "+ Add post"],
  ["Add milestone", "Add post"],
  ["Edit milestone", "Edit post"],
  ["Save milestone", "Save post"],
  ["New milestone", "New post"],
  ["Custom milestone", "Custom post"],
  ["Generate This Milestone", "Generate this post"],
  ["other milestones", "other posts"],
  ["your milestones", "your posts"],
  ["submitted milestones", "submitted posts"],
  ["Maps to ${sortedMilestones.length} milestones", "Maps to ${sortedMilestones.length} posts"],
  ["Maps to ${pb.steps.length} milestones", "Maps to ${pb.steps.length} posts"],
  ["Communication Plan maps to {session.milestones.length} milestones", "Communication plan maps to {session.milestones.length} posts"],
  ["Communication Plan mapped → \" + pb.steps.length + \" milestones", "Communication plan mapped → \" + pb.steps.length + \" posts"],
  [" milestone${milestones.length === 1 ? \"\" : \"s\"} in this campaign", " post${milestones.length === 1 ? \"\" : \"s\"} in this campaign"],
  [" milestones ready", " posts ready"],
  [" milestones in this campaign", " posts in this campaign"],
  ["Expand milestones", "Expand posts"],
  ["expand milestones", "expand posts"],
  ["seed milestones", "seed posts"],
  ["Milestone Progress", "Post progress"],
  ["Upcoming Milestones", "Upcoming posts"],
  ["Campaign milestones", "Campaign posts"],
  ["Milestone planning", "Posts"],
  ["Milestone not found.", "Post not found."],
  ["Milestone not found on this campaign", "Post not found on this campaign"],
  ["Select a milestone to clear.", "Select a post to clear."],
  ["No Meta milestones for this event.", "No Meta posts for this event."],
  ["No milestones are ready to schedule yet.", "No posts are ready to schedule yet."],
  ["This milestone has already been published.", "This post has already been published."],
  ["Send this milestone back", "Send this post back"],
  ["Edit this milestone without", "Edit this post without"],
  ["Mapped from communication plan · drag", "Mapped from communication plan · drag"],
  ["from communication plan · drag", "from communication plan · drag"],
  ["milestones arrive with the communication plan", "posts arrive with the communication plan"],
  ["your events, milestones, and what to do next", "your events, posts, and what to do next"],
  ["so milestones are ready", "so posts are ready"],
  ["for each milestone", "for each post"],
  ["per milestone", "per post"],
  ["Auto-publish milestones can", "Auto-publish posts can"],
  ["Inspiration → Milestones → Preview → Review", "Creative Setup → Posts → Preview → Review"],
  ["Creative Setup → Milestones → Preview → Review", "Creative Setup → Posts → Preview → Review"],
  ["Work through Inspiration → Milestones → Preview → Review → Published.", "Work through Creative Setup → Posts → Preview → Review → Published."],
  ["milestones step", "posts step"],
  ["create with ai milestones", "create with ai posts"],
  ["8 milestones ·", "8 posts ·"],
  ["5 milestones ·", "5 posts ·"],
  ["12 milestones", "12 posts"],
  ["<span>Milestone</span>", "<span>Post</span>"],
  ["Milestones from Create with AI", "Posts from Create with AI"],
  ["Generate artwork + captions per milestone", "Generate artwork + captions per post"],
  ["Inspiration / creative setup, logos, milestones", "Creative setup, logos, posts"],
  ["Milestone delete stays deleted", "Post delete stays deleted"],
  ["Creative Setup → Milestones → Preview → Review", "Creative Setup → Posts → Preview → Review"],
  ["Milestone Empty", "Post empty"],
  ["Milestone name", "Post name"],
  ["New Milestone", "New post"],
  ["Describe the purpose of this milestone", "Describe the purpose of this post"],
  ["Milestone templates are managed", "Post templates are managed"],
  ["edit milestone schedules", "edit post schedules"],
  ["Milestone Editor", "Post editor"],
  ["Milestone rail", "Post rail"],
  ["All milestones", "All posts"],
  ["all milestones", "all posts"],
  ["No milestones", "No posts"],
  ["no milestones", "no posts"],
  ["Add milestones", "Add posts"],
  ["add milestones", "add posts"],
  ["Reorder milestones", "Reorder posts"],
  ["reorder milestones", "reorder posts"],
  ["Delete milestone", "Delete post"],
  ["delete milestone", "delete post"],
  ["Remove milestone", "Remove post"],
  ["remove milestone", "remove post"],
  ["Milestone schedule", "Post schedule"],
  ["milestone schedule", "post schedule"],
  ["Milestone dates", "Post dates"],
  ["milestone dates", "post dates"],
  ["Milestone plan", "Post plan"],
  ["milestone plan", "post plan"],
  ["Milestone steps", "Posts"],
  ["milestone steps", "posts"],
  ["Milestone list", "Post list"],
  ["milestone list", "post list"],
  ["Milestone content", "Post content"],
  ["milestone content", "post content"],
  ["Milestone details", "Post details"],
  ["milestone details", "post details"],
  ["Milestone title", "Post title"],
  ["milestone title", "post title"],
  ["Milestone timing", "Post timing"],
  ["milestone timing", "post timing"],
  ["Milestone copy", "Post copy"],
  ["milestone copy", "post copy"],
  ["Milestone artwork", "Post artwork"],
  ["milestone artwork", "post artwork"],
  ["Milestone caption", "Post caption"],
  ["milestone caption", "post caption"],
  ["Milestone preview", "Post preview"],
  ["milestone preview", "post preview"],
  ["Milestone review", "Post review"],
  ["milestone review", "post review"],
  ["Milestone approval", "Post approval"],
  ["milestone approval", "post approval"],
  ["Milestone generation", "Post generation"],
  ["milestone generation", "post generation"],
  ["Milestone complete", "Post complete"],
  ["milestone complete", "post complete"],
  ["Milestone incomplete", "Post incomplete"],
  ["milestone incomplete", "post incomplete"],
  ["Milestone ready", "Post ready"],
  ["milestone ready", "post ready"],
  ["Milestone pending", "Post pending"],
  ["milestone pending", "post pending"],
  ["Milestone published", "Post published"],
  // Keep "Posted" approval status alone - don't replace
  ["Manage Posting plans", "Manage communication plans"],
  ["Communication posting plans", "Communication Plans"],
  ["Posting plans / Milestones", "Communication Plans / Posts"],
  ["Settings → Posting plans", "Settings → Communication Plans"],
];

function collect(entry) {
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
    if (name === "node_modules" || name === ".next") continue;
    out.push(...collect(join(entry, name)));
  }
  return out;
}

let changed = 0;
for (const dir of DIRS) {
  for (const file of collect(dir)) {
    if (file.includes("/__tests__/") && !file.includes("settings-ease-ui")) continue;
    let next = readFileSync(file, "utf8");
    const before = next;
    for (const [from, to] of REPLACEMENTS) {
      next = next.split(from).join(to);
    }
    if (next !== before) {
      writeFileSync(file, next, "utf8");
      changed++;
      console.log("updated:", file.replace(ROOT + "/", ""));
    }
  }
}
console.log(`\nDone. ${changed} files updated.`);
