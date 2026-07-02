/**
 * Live verification for Engine 7.1 — Organization Workspace
 * Usage: node --env-file=.env.local scripts/verify-organization-workspace.mjs
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = process.env.CAMPAIGNOS_BASE_URL ?? "http://localhost:3000";

const TEST_ROLE_NAME = "Engine 7.1 Verify Role";
const TEST_MEMBER_NAME = "Engine 7.1 Verify Member";
const TEST_MEMBER_EMAIL = "engine71-verify@campaignos.test";

if (!url || !key) {
  console.error("FAIL: missing Supabase env vars");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function req(path, opts = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

const results = [];
const pass = (message) => results.push(["PASS", message]);
const fail = (message) => results.push(["FAIL", message]);

const records = {
  organizationId: null,
  testRoleId: null,
  testMemberId: null,
  matrixEntryId: null,
  committeeEntryId: null,
  calendarOnlyEventId: null,
  fullCampaignEventId: null,
};

// 1. Confirm tables exist
const tables = [
  "organization_roles",
  "organization_members",
  "responsibility_matrix",
  "committee_defaults",
];

for (const table of tables) {
  const probe = await req(`${table}?select=id&limit=1`);
  if (probe.status === 200 && Array.isArray(probe.json)) {
    pass(`table ${table} exists`);
  } else {
    fail(`table ${table} probe (HTTP ${probe.status})`);
  }
}

// Resolve organization
const orgRes = await req("organizations?select=id,name&order=created_at.desc&limit=1");
records.organizationId = orgRes.json?.[0]?.id ?? null;
if (!records.organizationId) {
  fail("no organization found — complete School Setup first");
} else {
  pass(`organization resolved (${records.organizationId})`);
}

// 2. Trigger seeding via page load
const pageRes = await fetch(`${BASE}/settings/organization`, {
  redirect: "follow",
});
if (pageRes.status === 200) {
  pass("/settings/organization loads (HTTP 200)");
} else {
  fail(`/settings/organization (HTTP ${pageRes.status})`);
}

// Allow server seed to complete
await new Promise((r) => setTimeout(r, 1500));

// 3. Confirm seeding
if (records.organizationId) {
  const orgId = records.organizationId;

  const rolesRes = await req(
    `organization_roles?select=id,name,system_role&organization_id=eq.${orgId}`,
  );
  const roles = Array.isArray(rolesRes.json) ? rolesRes.json : [];
  const systemRoles = roles.filter((r) => r.system_role);
  if (systemRoles.length >= 9) {
    pass(`seeded ${systemRoles.length} system roles`);
  } else {
    fail(`expected >=9 system roles, got ${systemRoles.length}`);
  }

  const matrixRes = await req(
    `responsibility_matrix?select=id,responsibility_type,default_role_id&organization_id=eq.${orgId}`,
  );
  const matrix = Array.isArray(matrixRes.json) ? matrixRes.json : [];
  if (matrix.length >= 9) {
    pass(`seeded ${matrix.length} responsibility matrix rows`);
  } else {
    fail(`expected >=9 matrix rows, got ${matrix.length}`);
  }

  const committeeRes = await req(
    `committee_defaults?select=id,committee_name,default_role_id,communication_strategy,playbook_slug&organization_id=eq.${orgId}`,
  );
  const committees = Array.isArray(committeeRes.json) ? committeeRes.json : [];
  if (committees.length >= 8) {
    pass(`seeded ${committees.length} committee default rows`);
  } else {
    fail(`expected >=8 committee rows, got ${committees.length}`);
  }

  // 4. Add test custom role (or reuse)
  const existingRole = await req(
    `organization_roles?select=id&organization_id=eq.${orgId}&name=eq.${encodeURIComponent(TEST_ROLE_NAME)}&limit=1`,
  );
  if (existingRole.json?.[0]?.id) {
    records.testRoleId = existingRole.json[0].id;
    pass(`reused test custom role (${records.testRoleId})`);
  } else {
    const createRole = await req("organization_roles", {
      method: "POST",
      body: JSON.stringify({
        organization_id: orgId,
        name: TEST_ROLE_NAME,
        system_role: false,
        description: "Live verification custom role for Engine 7.1",
      }),
      headers: { Prefer: "return=representation" },
    });
    records.testRoleId = createRole.json?.[0]?.id ?? null;
    if (createRole.status === 201 && records.testRoleId) {
      pass(`created test custom role (${records.testRoleId})`);
    } else {
      fail(`create test custom role (HTTP ${createRole.status})`);
    }
  }

  // 5. Add test member
  const existingMember = await req(
    `organization_members?select=id&organization_id=eq.${orgId}&email=eq.${encodeURIComponent(TEST_MEMBER_EMAIL)}&limit=1`,
  );
  if (existingMember.json?.[0]?.id) {
    records.testMemberId = existingMember.json[0].id;
    const patchMember = await req(
      `organization_members?id=eq.${records.testMemberId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          name: TEST_MEMBER_NAME,
          organization_role_id: records.testRoleId,
          active: true,
        }),
        headers: { Prefer: "return=minimal" },
      },
    );
    if ([200, 204].includes(patchMember.status)) {
      pass(`updated test member (${records.testMemberId})`);
    } else {
      fail(`update test member (HTTP ${patchMember.status})`);
    }
  } else if (records.testRoleId) {
    const createMember = await req("organization_members", {
      method: "POST",
      body: JSON.stringify({
        organization_id: orgId,
        name: TEST_MEMBER_NAME,
        email: TEST_MEMBER_EMAIL,
        organization_role_id: records.testRoleId,
        active: true,
      }),
      headers: { Prefer: "return=representation" },
    });
    records.testMemberId = createMember.json?.[0]?.id ?? null;
    if (createMember.status === 201 && records.testMemberId) {
      pass(`created test member (${records.testMemberId})`);
    } else {
      fail(`create test member (HTTP ${createMember.status})`);
    }
  }

  // 6. Update one responsibility matrix row
  const facebookRow = matrix.find((r) => r.responsibility_type === "facebook");
  if (facebookRow?.id && records.testRoleId) {
    records.matrixEntryId = facebookRow.id;
    const vpComms = roles.find((r) => r.name === "VP Communications");
    const revertRoleId = vpComms?.id ?? null;
    const patchMatrix = await req(
      `responsibility_matrix?id=eq.${facebookRow.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ default_role_id: records.testRoleId }),
        headers: { Prefer: "return=minimal" },
      },
    );
    if ([200, 204].includes(patchMatrix.status)) {
      pass(`updated responsibility matrix facebook → test role`);
      // revert for cleanliness optional - user asked to update, keep updated
    } else {
      fail(`update responsibility matrix (HTTP ${patchMatrix.status})`);
    }
    records._revertMatrixRoleId = revertRoleId;
  } else {
    fail("facebook responsibility matrix row not found");
  }

  // 7. Update one committee default row
  const bookFairRow = committees.find((r) => r.committee_name === "book_fair");
  if (bookFairRow?.id && records.testRoleId) {
    records.committeeEntryId = bookFairRow.id;
    const patchCommittee = await req(
      `committee_defaults?id=eq.${bookFairRow.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          default_role_id: records.testRoleId,
          communication_strategy: "reminder_only",
          playbook_slug: "general-event",
        }),
        headers: { Prefer: "return=minimal" },
      },
    );
    if ([200, 204].includes(patchCommittee.status)) {
      pass(`updated committee default book_fair → test role, reminder_only`);
    } else {
      fail(`update committee default (HTTP ${patchCommittee.status})`);
    }
  } else {
    fail("book_fair committee default row not found");
  }
}

// 8. Event workspace — Organization Defaults panel (HTTP + content probe)
const fullEventId = "79659782-ce78-4f74-bd1b-1906177f879e";
records.fullCampaignEventId = fullEventId;
const eventPage = await fetch(`${BASE}/events/${fullEventId}`);
const eventHtml = await eventPage.text();
if (eventPage.status === 200 && eventHtml.includes("Organization Defaults")) {
  pass("Event workspace renders Organization Defaults panel");
} else {
  fail(
    `Event workspace Organization Defaults panel (HTTP ${eventPage.status}, found=${eventHtml.includes("Organization Defaults")})`,
  );
}

// 9. Calendar-only event — no campaign assignments
const TEST_TITLE = "Strategy Verify Calendar Only";
const existingCal = await req(
  `events?select=id&title=eq.${encodeURIComponent(TEST_TITLE)}&limit=1`,
);
records.calendarOnlyEventId = existingCal.json?.[0]?.id ?? null;

if (!records.calendarOnlyEventId) {
  const createCal = await req("events", {
    method: "POST",
    body: JSON.stringify({
      title: TEST_TITLE,
      description: "Calendar-only verification event.",
      date: "2099-01-15",
      status: "draft",
      communication_strategy: "calendar_only",
      event_type: "general_event",
    }),
    headers: { Prefer: "return=representation" },
  });
  records.calendarOnlyEventId = createCal.json?.[0]?.id ?? null;
}

if (records.calendarOnlyEventId) {
  const calPage = await fetch(`${BASE}/events/${records.calendarOnlyEventId}`);
  const calHtml = await calPage.text();
  const hasDefaults =
    calPage.status === 200 && calHtml.includes("Organization Defaults");
  const noPlaybookSection =
    !calHtml.includes("Assigned Playbook") &&
    !calHtml.includes("Communication Timeline");

  const [assign, steps] = await Promise.all([
    req(
      `event_playbook_assignments?select=id&event_id=eq.${records.calendarOnlyEventId}`,
    ),
    req(
      `event_communication_steps?select=id&event_id=eq.${records.calendarOnlyEventId}`,
    ),
  ]);
  const assignCount = assign.json?.length ?? 0;
  const stepCount = steps.json?.length ?? 0;

  if (assignCount === 0 && stepCount === 0) {
    pass("calendar_only event has 0 playbook assignments and 0 timeline rows");
  } else {
    fail(
      `calendar_only assignments=${assignCount} steps=${stepCount} (expected 0/0)`,
    );
  }

  if (hasDefaults) {
    pass("calendar_only event workspace shows Organization Defaults panel");
  } else {
    fail("calendar_only event missing Organization Defaults panel");
  }

  if (noPlaybookSection || calHtml.includes("Calendar Only")) {
    pass("calendar_only event workspace skips campaign sections");
  } else {
    fail("calendar_only event may still show campaign UI");
  }
} else {
  fail("calendar_only test event unavailable");
}

for (const [status, message] of results) {
  console.log(`${status}: ${message}`);
}

console.log("");
console.log("TEST_RECORDS:");
console.log(JSON.stringify(records, null, 2));

const failCount = results.filter(([s]) => s === "FAIL").length;
process.exit(failCount > 0 ? 1 : 0);
