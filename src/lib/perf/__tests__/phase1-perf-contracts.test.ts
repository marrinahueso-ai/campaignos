import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const root = path.join(import.meta.dirname, "../../../..");

function readSrc(rel: string): string {
  return readFileSync(path.join(root, "src", rel), "utf8");
}

describe("Phase 1 perf guardrails (source contracts)", () => {
  it("newsletter quiet autosave skips composer remount but refreshes library", () => {
    const actions = readSrc("lib/newsletter/actions.ts");
    assert.match(actions, /quiet\?: boolean/);
    const quietStart = actions.indexOf("function revalidateNewsletterQuiet");
    const quietEnd = actions.indexOf("\n}", quietStart) + 2;
    const quietFn = actions.slice(quietStart, quietEnd);
    assert.match(quietFn, /revalidatePath\("\/newsletters"\)/);
    assert.doesNotMatch(quietFn, /revalidatePath\("\/newsletter-composer"\)/);

    const builder = readSrc(
      "components/newsletters/builder/NewsletterBlockBuilder.tsx",
    );
    assert.match(builder, /skipNextAutosaveRef/);
    assert.match(builder, /lastSavedFingerprintRef/);
    assert.match(builder, /quiet:\s*true/);
  });

  it("flyer quiet draft skips builder remount; generate has maxDuration", () => {
    const actions = readSrc("lib/flyers/actions.ts");
    assert.match(actions, /quiet\?: boolean/);
    const quietStart = actions.indexOf("function revalidateFlyerQuiet");
    const quietEnd = actions.indexOf("\n}", quietStart) + 2;
    const quietFn = actions.slice(quietStart, quietEnd);
    assert.match(quietFn, /revalidatePath\("\/flyers"\)/);
    assert.doesNotMatch(quietFn, /create-with-ai\/flyer/);

    const shell = readSrc("components/flyers/FlyerBuilderShell.tsx");
    assert.match(shell, /quiet:\s*true/);
    const generateStart = shell.indexOf("async function runGenerate");
    const generateEnd = shell.indexOf("\n  function handleSendForApproval", generateStart);
    assert.doesNotMatch(shell.slice(generateStart, generateEnd), /router\.refresh\(\)/);

    const route = readSrc("app/api/flyer-composer/generate/route.ts");
    assert.match(route, /maxDuration\s*=\s*300/);

    const queries = readSrc("lib/flyers/queries.ts");
    assert.match(queries, /omit composer_state/);
    const listStart = queries.indexOf("listFlyersForOrg");
    const listEnd = queries.indexOf("export async function getFlyerById", listStart);
    assert.doesNotMatch(queries.slice(listStart, listEnd), /\.select\("\*"\)/);
  });

  it("campaign builder skips unchanged POSTs and no-op name sync", () => {
    const provider = readSrc(
      "components/campaign-builder-v2/CampaignBuilderProvider.tsx",
    );
    assert.match(provider, /lastServerSavedJsonRef/);
    assert.match(provider, /1500/);

    const session = readSrc("lib/campaign-builder-v2/session.ts");
    assert.match(
      session,
      /syncSchedulingMilestoneNamesFromSession\(protectedSession,\s*existing\)/,
    );

    const names = readSrc("lib/approvals-scheduling/live-milestone-names.ts");
    assert.match(names, /previous\?: CampaignBuilderSession/);
    assert.match(names, /if \(changed\.length === 0 && previous\)/);
  });

  it("events parallelizes artwork + hero stats; files streams via Suspense", () => {
    const events = readSrc("app/(dashboard)/events/page.tsx");
    assert.match(events, /artworkPromise/);
    assert.match(events, /Promise\.all\(\[\s*artworkPromise/);

    const files = readSrc("app/(dashboard)/files/page.tsx");
    assert.match(files, /async function FilesPageBody/);
    assert.match(files, /<Suspense/);

    const playbooks = readSrc("lib/event-playbooks/queries.ts");
    assert.match(playbooks, /export const getEventPlaybookEvents = cache\(/);
  });
});
