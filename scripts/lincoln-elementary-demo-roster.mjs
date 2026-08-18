/**
 * Seed fictional Team & Access roster people onto Lincoln Elementary (School B).
 *
 * Roster-only: organization_members (+ org-scoped roles / committee chairs).
 * Does not create Auth users, organization_users seats, or send email.
 *
 * Isolation: every write is scoped to LINCOLN_ELEMENTARY_ORG_ID. Email uniqueness
 * is per-organization. Refuse Edmondson / any other tenant.
 *
 * Usage:
 *   node scripts/lincoln-elementary-demo-roster.mjs
 *   DRY_RUN=1 node scripts/lincoln-elementary-demo-roster.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Production School B — never seed another org from this script. */
export const LINCOLN_ELEMENTARY_ORG_ID =
  "0a7efc8a-ff81-4d68-8a5d-a695d2df5476";

export const LINCOLN_ELEMENTARY_DISPLAY_NAME = "Lincoln Elementary";

const BLOCKED_ORG_IDS = new Set([
  "d88b2f96-b924-4bd5-b6e2-40ad8ee84592",
  "0bafe608-072c-4abb-9f9e-bb08c1f2a2d3",
  "bcd3a219-5b3e-4d42-905d-e12646925ede",
]);

/** @typedef {"admin"|"president"|"vp_communications"|"committee_chair"|"contributor"|"view_only"|"developer"|"tester"} CampaignRole */
/** @typedef {"president"|"vp"|"other"} RoleKind */

/**
 * @typedef {object} LincolnDemoPerson
 * @property {string} name
 * @property {string} email
 * @property {string} title
 * @property {string} [roleName]
 * @property {CampaignRole} campaignRole
 * @property {RoleKind} roleKind
 * @property {string | null} [committeeName]
 */

/** Fictional demo roster — @example.com only; not imported by the Next.js app. */
export const LINCOLN_DEMO_PEOPLE = /** @type {LincolnDemoPerson[]} */ ([
  {
    name: "Sarah Mitchell",
    email: "sarah.mitchell@example.com",
    title: "PTO President",
    roleName: "President",
    campaignRole: "president",
    roleKind: "president",
    committeeName: null,
  },
  {
    name: "Emily Carter",
    email: "emily.carter@example.com",
    title: "VP Communications",
    campaignRole: "vp_communications",
    roleKind: "vp",
    committeeName: null,
  },
  {
    name: "Jessica Reynolds",
    email: "jessica.reynolds@example.com",
    title: "Treasurer",
    campaignRole: "committee_chair",
    roleKind: "other",
    committeeName: null,
  },
  {
    name: "Amanda Brooks",
    email: "amanda.brooks@example.com",
    title: "Secretary",
    campaignRole: "committee_chair",
    roleKind: "other",
    committeeName: null,
  },
  {
    name: "Lauren Davis",
    email: "lauren.davis@example.com",
    title: "Events Chair",
    campaignRole: "committee_chair",
    roleKind: "other",
    committeeName: "Family Event",
  },
  {
    name: "Megan Thompson",
    email: "megan.thompson@example.com",
    title: "Volunteer Chair",
    campaignRole: "committee_chair",
    roleKind: "other",
    committeeName: "Volunteer Recruitment",
  },
  {
    name: "Rachel Parker",
    email: "rachel.parker@example.com",
    title: "Fundraising Chair",
    campaignRole: "committee_chair",
    roleKind: "other",
    committeeName: "Fundraising",
  },
  {
    name: "Nicole Bennett",
    email: "nicole.bennett@example.com",
    title: "Spirit Wear Chair",
    campaignRole: "committee_chair",
    roleKind: "other",
    committeeName: "Spirit Wear",
  },
  {
    name: "Ashley Morgan",
    email: "ashley.morgan@example.com",
    title: "Room Parent Coordinator",
    campaignRole: "contributor",
    roleKind: "other",
    committeeName: null,
  },
  {
    name: "Katie Sullivan",
    email: "katie.sullivan@example.com",
    title: "Newsletter Chair",
    campaignRole: "committee_chair",
    roleKind: "other",
    committeeName: null,
  },
  {
    name: "Daniel Foster",
    email: "daniel.foster@example.com",
    title: "Volunteer",
    campaignRole: "contributor",
    roleKind: "other",
    committeeName: null,
  },
  {
    name: "Michael Hayes",
    email: "michael.hayes@example.com",
    title: "Volunteer",
    campaignRole: "contributor",
    roleKind: "other",
    committeeName: null,
  },
  {
    name: "Jennifer Collins",
    email: "jennifer.collins@example.com",
    title: "Committee Member",
    campaignRole: "contributor",
    roleKind: "other",
    committeeName: "General PTO Meeting",
  },
  {
    name: "Rebecca Turner",
    email: "rebecca.turner@example.com",
    title: "Committee Member",
    campaignRole: "contributor",
    roleKind: "other",
    committeeName: "General PTO Meeting",
  },
  {
    name: "Allison Reed",
    email: "allison.reed@example.com",
    title: "Committee Member",
    campaignRole: "contributor",
    roleKind: "other",
    committeeName: "General PTO Meeting",
  },
]);

export function assertDemoEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith("@example.com")) {
    throw new Error(`Demo emails must use @example.com: ${email}`);
  }
  return normalized;
}

export function assertLincolnDemoOrg(org) {
  if (!org?.id) {
    throw new Error("Lincoln Elementary was not found.");
  }
  if (org.id !== LINCOLN_ELEMENTARY_ORG_ID) {
    throw new Error(`Refusing to seed org ${org.id}; expected Lincoln Elementary.`);
  }
  if (BLOCKED_ORG_IDS.has(org.id)) {
    throw new Error("Refusing to seed Edmondson or another school.");
  }
  if (!/lincoln\s+elementary|lincolin\s+elementary/i.test(org.name ?? "")) {
    throw new Error(
      `Org ${org.id} is named "${org.name}", not Lincoln Elementary.`,
    );
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    if (process.env[key]) continue;
    process.env[key] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function rest(url, key, path, options = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: options.prefer ?? "return=representation",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} ${res.status} ${text.slice(0, 500)}`);
  }
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function seedLincolnElementaryDemoRoster(opts = {}) {
  const dryRun = Boolean(opts.dryRun);
  loadEnvFile(".env.local");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  for (const person of LINCOLN_DEMO_PEOPLE) {
    assertDemoEmail(person.email);
  }

  const [org] = await rest(
    url,
    key,
    `organizations?select=id,name&id=eq.${LINCOLN_ELEMENTARY_ORG_ID}`,
  );
  assertLincolnDemoOrg(org);

  if (!dryRun && org.name !== LINCOLN_ELEMENTARY_DISPLAY_NAME) {
    await rest(
      url,
      key,
      `organizations?id=eq.${LINCOLN_ELEMENTARY_ORG_ID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: LINCOLN_ELEMENTARY_DISPLAY_NAME }),
        prefer: "return=minimal",
      },
    );
  }

  const existingRoles = await rest(
    url,
    key,
    `organization_roles?select=id,name,sort_order&organization_id=eq.${LINCOLN_ELEMENTARY_ORG_ID}&order=sort_order.asc`,
  );
  const roleByName = new Map(
    (existingRoles ?? []).map((row) => [row.name.trim().toLowerCase(), row]),
  );
  let nextSort =
    Math.max(0, ...(existingRoles ?? []).map((row) => row.sort_order ?? 0)) + 10;

  const wantedRoles = new Map();
  for (const person of LINCOLN_DEMO_PEOPLE) {
    const roleName = person.roleName ?? person.title;
    if (!wantedRoles.has(roleName.toLowerCase())) {
      wantedRoles.set(roleName.toLowerCase(), {
        name: roleName,
        roleKind: person.roleKind,
        campaignRole: person.campaignRole,
      });
    }
  }

  for (const wanted of wantedRoles.values()) {
    const keyName = wanted.name.trim().toLowerCase();
    if (roleByName.has(keyName)) continue;
    if (dryRun) {
      roleByName.set(keyName, { id: `dry-run-${keyName}`, name: wanted.name });
      continue;
    }
    const [created] = await rest(url, key, "organization_roles", {
      method: "POST",
      body: JSON.stringify({
        organization_id: LINCOLN_ELEMENTARY_ORG_ID,
        name: wanted.name,
        system_role: false,
        description: `Demo roster title for ${LINCOLN_ELEMENTARY_DISPLAY_NAME}.`,
        role_kind: wanted.roleKind,
        campaign_role: wanted.campaignRole,
        sort_order: nextSort,
      }),
    });
    nextSort += 10;
    roleByName.set(keyName, created);
  }

  const committees = await rest(
    url,
    key,
    `organization_committees?select=id,name&organization_id=eq.${LINCOLN_ELEMENTARY_ORG_ID}`,
  );
  const committeeByName = new Map(
    (committees ?? []).map((row) => [row.name.trim().toLowerCase(), row]),
  );

  const existingMembers = await rest(
    url,
    key,
    `organization_members?select=id,name,email,organization_id&organization_id=eq.${LINCOLN_ELEMENTARY_ORG_ID}`,
  );
  const memberByEmail = new Map(
    (existingMembers ?? [])
      .filter((row) => row.email)
      .map((row) => [row.email.trim().toLowerCase(), row]),
  );

  const summary = { inserted: 0, updated: 0, assignments: 0, skipped: 0 };

  for (const person of LINCOLN_DEMO_PEOPLE) {
    const email = assertDemoEmail(person.email);
    const roleName = (person.roleName ?? person.title).trim().toLowerCase();
    const role = roleByName.get(roleName);
    if (!role) {
      throw new Error(`Missing role ${person.roleName ?? person.title}`);
    }

    const payload = {
      organization_id: LINCOLN_ELEMENTARY_ORG_ID,
      name: person.name,
      email,
      organization_role_id: dryRun ? null : role.id,
      campaign_role: person.campaignRole,
      active: true,
    };

    let memberId = memberByEmail.get(email)?.id ?? null;
    if (dryRun) {
      if (memberId) summary.updated += 1;
      else summary.inserted += 1;
    } else if (memberId) {
      await rest(url, key, `organization_members?id=eq.${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.name,
          organization_role_id: payload.organization_role_id,
          campaign_role: payload.campaign_role,
          active: true,
        }),
        prefer: "return=minimal",
      });
      summary.updated += 1;
    } else {
      const [created] = await rest(url, key, "organization_members", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      memberId = created.id;
      memberByEmail.set(email, created);
      summary.inserted += 1;
    }

    if (!person.committeeName || !memberId || dryRun) continue;
    const committee = committeeByName.get(person.committeeName.trim().toLowerCase());
    if (!committee) {
      throw new Error(`Missing committee ${person.committeeName} on Lincoln Elementary`);
    }
    const assignmentRole =
      person.title.toLowerCase().includes("chair") ? "chair" : "member";
    const existingAssignment = await rest(
      url,
      key,
      `organization_committee_assignments?select=id&organization_id=eq.${LINCOLN_ELEMENTARY_ORG_ID}&organization_member_id=eq.${memberId}&committee_id=eq.${committee.id}`,
    );
    if ((existingAssignment ?? []).length > 0) {
      summary.skipped += 1;
      continue;
    }
    await rest(url, key, "organization_committee_assignments", {
      method: "POST",
      body: JSON.stringify({
        organization_id: LINCOLN_ELEMENTARY_ORG_ID,
        organization_member_id: memberId,
        committee_id: committee.id,
        role: assignmentRole,
      }),
      prefer: "return=minimal",
    });
    summary.assignments += 1;
  }

  // Isolation check: these emails must not exist on any other org.
  const leaked = await rest(
    url,
    key,
    "organization_members?select=id,organization_id,email&email=ilike.*@example.com",
  );
  const leak = (leaked ?? []).filter(
    (row) => row.organization_id !== LINCOLN_ELEMENTARY_ORG_ID,
  );
  if (leak.length > 0) {
    throw new Error(
      `Demo emails leaked to other orgs: ${leak.map((row) => row.organization_id).join(", ")}`,
    );
  }

  return {
    dryRun,
    organizationId: LINCOLN_ELEMENTARY_ORG_ID,
    organizationName: dryRun ? org.name : LINCOLN_ELEMENTARY_DISPLAY_NAME,
    ...summary,
  };
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  seedLincolnElementaryDemoRoster({
    dryRun: process.env.DRY_RUN === "1",
  })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
