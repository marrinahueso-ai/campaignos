const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  return { status: res.status, json };
}

const results = [];
const pass = (message) => results.push(["PASS", message]);
const fail = (message) => results.push(["FAIL", message]);

const col = await req("events?select=communication_strategy&limit=1");
if (
  col.status === 200 &&
  Array.isArray(col.json) &&
  col.json.length &&
  "communication_strategy" in col.json[0]
) {
  pass("events.communication_strategy column exists");
} else {
  fail(`events.communication_strategy column probe (HTTP ${col.status})`);
}

const all = await req("events?select=id,communication_strategy");
const rows = Array.isArray(all.json) ? all.json : [];
const TEST_TITLE = "Strategy Verify Calendar Only";
const preTestRows = rows.filter((row) => row.id);

if (!preTestRows.length) {
  fail("no events in database to verify defaults");
} else {
  const nonTest = preTestRows.filter(
    (row) => row.communication_strategy !== "full_campaign",
  );
  const onlyTestNonDefault =
    nonTest.length === 1 &&
    (await req(
      `events?select=id&title=eq.${encodeURIComponent(TEST_TITLE)}&limit=1`,
    )).json?.[0]?.id === nonTest[0]?.id;

  if (nonTest.length === 0 || onlyTestNonDefault) {
    pass("existing production events default to full_campaign");
  } else {
    fail(`${nonTest.length} event(s) are not full_campaign before isolated test`);
  }
}

const existing = await req(
  `events?select=id&title=eq.${encodeURIComponent(TEST_TITLE)}&limit=1`,
);
let testId = existing.json?.[0]?.id;

if (testId) {
  const patch = await req(`events?id=eq.${testId}`, {
    method: "PATCH",
    body: JSON.stringify({
      communication_strategy: "calendar_only",
      title: TEST_TITLE,
      description: "Live verification test event for calendar-only strategy.",
      date: "2099-01-15",
      status: "draft",
    }),
    headers: { Prefer: "return=minimal" },
  });
  if ([200, 204].includes(patch.status)) {
    pass(`updated existing test event to calendar_only (${testId})`);
  } else {
    fail(`update test event to calendar_only (HTTP ${patch.status})`);
  }
} else {
  const create = await req("events", {
    method: "POST",
    body: JSON.stringify({
      title: TEST_TITLE,
      description: "Live verification test event for calendar-only strategy.",
      date: "2099-01-15",
      status: "draft",
      communication_strategy: "calendar_only",
      event_type: "general_event",
    }),
    headers: { Prefer: "return=representation" },
  });
  testId = create.json?.[0]?.id;
  if (create.status === 201 && testId) {
    pass(`created calendar_only test event (${testId})`);
  } else {
    fail(`create calendar_only test event (HTTP ${create.status})`);
  }
}

if (testId) {
  const [assign, steps] = await Promise.all([
    req(`event_playbook_assignments?select=id&event_id=eq.${testId}`),
    req(`event_communication_steps?select=id&event_id=eq.${testId}`),
  ]);
  const assignCount = assign.json?.length ?? 0;
  const stepCount = steps.json?.length ?? 0;
  if (assignCount === 0 && stepCount === 0) {
    pass("calendar_only event has 0 playbook assignments and 0 timeline rows");
  } else {
    fail(
      `calendar_only event has assignments=${assignCount} steps=${stepCount} (expected 0/0)`,
    );
  }
} else {
  fail("skipped playbook/timeline check (no test event id)");
}

const KNOWN_FULL_CAMPAIGN_ID = "79659782-ce78-4f74-bd1b-1906177f879e";
const [fullEvent, fullAssign, fullSteps] = await Promise.all([
  req(
    `events?select=id,communication_strategy&id=eq.${KNOWN_FULL_CAMPAIGN_ID}`,
  ),
  req(
    `event_playbook_assignments?select=id&event_id=eq.${KNOWN_FULL_CAMPAIGN_ID}`,
  ),
  req(
    `event_communication_steps?select=id&event_id=eq.${KNOWN_FULL_CAMPAIGN_ID}`,
  ),
]);

const fullId = fullEvent.json?.[0]?.id;
if (!fullId || fullEvent.json?.[0]?.communication_strategy !== "full_campaign") {
  fail("known full_campaign verification event unavailable");
} else if ((fullAssign.json?.length ?? 0) > 0 && (fullSteps.json?.length ?? 0) > 0) {
  pass("full_campaign event has playbook assignment and timeline rows");
} else {
  fail(
    `full_campaign event missing playbook/timeline (assign=${fullAssign.json?.length ?? 0} steps=${fullSteps.json?.length ?? 0})`,
  );
}

for (const [status, message] of results) {
  console.log(`${status}: ${message}`);
}

console.log(`CALENDAR_ONLY_EVENT_ID=${testId ?? ""}`);
console.log(`FULL_CAMPAIGN_EVENT_ID=${fullId ?? KNOWN_FULL_CAMPAIGN_ID}`);

const failCount = results.filter(([status]) => status === "FAIL").length;
process.exit(failCount > 0 ? 1 : 0);
