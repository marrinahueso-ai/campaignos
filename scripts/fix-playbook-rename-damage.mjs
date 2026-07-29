#!/usr/bin/env node
/**
 * Revert accidental internal renames from the playbook→posting plan script.
 * Keeps customer-facing copy; restores imports, DB tables, routes, internal IDs.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const FIXES = [
  ["@/types/event-posting plans", "@/types/event-playbooks"],
  ["@/types/posting plans", "@/types/playbooks"],
  ['.from("communication_posting plans")', '.from("communication_playbooks")'],
  ['.from("organization_hidden_posting plans")', '.from("organization_hidden_playbooks")'],
  ['revalidatePath("/settings/posting plans")', 'revalidatePath("/settings/playbooks-milestones")'],
  ['href="/settings/posting plans"', 'href="/settings/playbooks-milestones"'],
  ['pathname.startsWith("/settings/posting plans")', 'pathname.startsWith("/settings/playbooks-milestones")'],
  ['type TabId = "posting plans" | "milestones"', 'type TabId = "playbooks" | "milestones"'],
  ['useState<TabId>("posting plans")', 'useState<TabId>("playbooks")'],
  ['{ id: "posting plans" as const', '{ id: "playbooks" as const'],
  ['activeTab === "posting plans"', 'activeTab === "playbooks"'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".git") continue;
      walk(full, out);
    } else if ([".ts", ".tsx", ".md", ".html", ".mjs"].includes(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (file.includes("fix-playbook-rename-damage.mjs")) continue;
  let content = readFileSync(file, "utf8");
  let next = content;
  for (const [from, to] of FIXES) {
    next = next.split(from).join(to);
  }
  if (next !== content) {
    writeFileSync(file, next, "utf8");
    changed++;
    console.log("fixed:", file.replace(ROOT + "/", ""));
  }
}
console.log(`\nDone. ${changed} files fixed.`);
