#!/usr/bin/env node
/**
 * Seed 20 synthetic schools + users + events + approvals + inbox threads.
 * Uses SUPABASE_SERVICE_ROLE_KEY against the staging project only.
 *
 *   TEST_RUN_ID=k6-demo K6_TEST_PASSWORD='…' \
 *     node --env-file=.env.local load-tests/k6/scripts/seed-load-test-data.mjs
 *
 * Writes load-tests/k6/data/accounts.local.json (gitignored).
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSafeTarget,
  k6Root,
  loadDefaultEnvFiles,
  requireEnv,
} from "./lib/env.mjs";
import {
  SCHOOL_COUNT,
  buildSchoolUsers,
  k6Prefix,
  listSchools,
  schoolName,
} from "./lib/schools.mjs";

loadDefaultEnvFiles();
assertSafeTarget();

const testRunId = requireEnv("TEST_RUN_ID");
const password = requireEnv("K6_TEST_PASSWORD");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const schoolCount = Number(process.env.K6_SCHOOL_COUNT || SCHOOL_COUNT);
const emailDomain =
  process.env.K6_EMAIL_DOMAIN || "loadtest.heyralli.invalid";

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const prefix = k6Prefix(testRunId);
// role_kind check: president | vp | other (migration 024)
const SYSTEM_ROLES = [
  { name: "President", description: "Final approvals", role_kind: "president", sort_order: 10 },
  { name: "VP Communications", description: "Comms", role_kind: "vp", sort_order: 20 },
  { name: "VP Events", description: "Events", role_kind: "vp", sort_order: 30 },
  { name: "Creative Chair", description: "Creative", role_kind: "other", sort_order: 40 },
  { name: "Website Chair", description: "Website", role_kind: "other", sort_order: 50 },
  { name: "Volunteer Coordinator", description: "Volunteers", role_kind: "other", sort_order: 60 },
  { name: "Viewer", description: "Read-only", role_kind: "other", sort_order: 90 },
];

async function ensureAuthUser(email, displayName) {
  // Try create; on conflict look up by email
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName, load_test_run_id: testRunId },
  });
  if (!error && created?.user) {
    return created.user;
  }

  const msg = error?.message || "";
  if (!/already|registered|exists/i.test(msg)) {
    throw new Error(`createUser ${email}: ${msg}`);
  }

  // Paginate listUsers is heavy; use generateLink / get by email via RPC-less filter
  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);
  const found = listed.users.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );
  if (!found) {
    throw new Error(`User ${email} exists but could not be listed`);
  }
  // Reset password for mint reliability
  await admin.auth.admin.updateUserById(found.id, {
    password,
    email_confirm: true,
  });
  return found;
}

async function seedOrgRoles(organizationId) {
  const { count } = await admin
    .from("organization_roles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if ((count ?? 0) > 0) {
    const { data } = await admin
      .from("organization_roles")
      .select("id, name")
      .eq("organization_id", organizationId);
    return new Map((data || []).map((r) => [r.name, r.id]));
  }

  const rows = SYSTEM_ROLES.map((r) => ({
    organization_id: organizationId,
    name: r.name,
    system_role: false,
    description: r.description,
    role_kind: r.role_kind,
    sort_order: r.sort_order,
  }));
  const { data, error } = await admin
    .from("organization_roles")
    .insert(rows)
    .select("id, name");
  if (error) throw new Error(`organization_roles: ${error.message}`);
  return new Map((data || []).map((r) => [r.name, r.id]));
}

async function ensureSchoolYear(organizationId) {
  const label = "2025-2026";
  const { data: existing } = await admin
    .from("school_years")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("label", label)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("organizations")
      .update({ active_school_year_id: existing.id })
      .eq("id", organizationId);
    return existing.id;
  }

  const { data, error } = await admin
    .from("school_years")
    .insert({
      organization_id: organizationId,
      label,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`school_years: ${error.message}`);

  await admin
    .from("organizations")
    .update({ active_school_year_id: data.id })
    .eq("id", organizationId);
  return data.id;
}

async function seedSchool(schoolIndex) {
  const name = schoolName(schoolIndex);
  const orgDisplayName = `${name} (${testRunId})`;

  // Reuse org if same TEST_RUN_ID name already exists
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id, name")
    .eq("name", orgDisplayName)
    .maybeSingle();

  let organizationId = existingOrg?.id;
  if (!organizationId) {
    const trialEnds = new Date();
    trialEnds.setFullYear(trialEnds.getFullYear() + 1);
    const orgPayload = {
      name: orgDisplayName,
      timezone: "America/Chicago",
      plan_tier: "trial",
      subscription_status: "trialing",
      trial_ends_at: trialEnds.toISOString(),
      billing_exempt_at: new Date().toISOString(),
    };
    let { data: org, error } = await admin
      .from("organizations")
      .insert(orgPayload)
      .select("id")
      .single();
    if (error && /billing_exempt|column|trial_ends|plan_tier|subscription/i.test(error.message)) {
      // Retry with name-only minimal insert on older schemas
      ({ data: org, error } = await admin
        .from("organizations")
        .insert({ name: orgDisplayName, timezone: "America/Chicago" })
        .select("id")
        .single());
    }
    if (error) throw new Error(`organizations insert: ${error.message}`);
    organizationId = org.id;
  }

  const roleByName = await seedOrgRoles(organizationId);
  const schoolYearId = await ensureSchoolYear(organizationId);
  const usersSpec = buildSchoolUsers(schoolIndex, testRunId, emailDomain);
  const users = [];

  for (const spec of usersSpec) {
    const authUser = await ensureAuthUser(spec.email, spec.displayName);
    const orgRoleId = roleByName.get(spec.orgRoleName) || null;

    const { data: membership } = await admin
      .from("organization_users")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", spec.email)
      .maybeSingle();

    if (membership?.id) {
      await admin
        .from("organization_users")
        .update({
          user_id: authUser.id,
          campaign_role: spec.campaignRole,
          organization_role_id: orgRoleId,
          status: "active",
          joined_at: new Date().toISOString(),
        })
        .eq("id", membership.id);
    } else {
      const { error: memErr } = await admin.from("organization_users").insert({
        organization_id: organizationId,
        user_id: authUser.id,
        email: spec.email,
        campaign_role: spec.campaignRole,
        organization_role_id: orgRoleId,
        status: "active",
        joined_at: new Date().toISOString(),
      });
      if (memErr) throw new Error(`organization_users ${spec.email}: ${memErr.message}`);
    }

    users.push({
      ...spec,
      userId: authUser.id,
    });
  }

  // Events (2 per school)
  const eventIds = [];
  const eventTitles = [];
  for (let e = 1; e <= 2; e += 1) {
    const title = `${prefix} School ${String(schoolIndex).padStart(2, "0")} Event ${e}`;
    const date = new Date();
    date.setDate(date.getDate() + 14 + schoolIndex + e);

    const { data: existingEvent } = await admin
      .from("events")
      .select("id")
      .eq("school_year_id", schoolYearId)
      .eq("title", title)
      .maybeSingle();

    let eventId = existingEvent?.id;
    if (!eventId) {
      const { data: ev, error: evErr } = await admin
        .from("events")
        .insert({
          title,
          description: `${prefix} synthetic load-test event — safe to delete`,
          date: date.toISOString().slice(0, 10),
          status: "scheduled",
          school_year_id: schoolYearId,
          location: "Gymnasium",
        })
        .select("id")
        .single();
      if (evErr) throw new Error(`events: ${evErr.message}`);
      eventId = ev.id;
    }
    eventIds.push(eventId);
    eventTitles.push(title);

    // Pending approval (unified queue)
    const { count: apprCount } = await admin
      .from("approval_scheduling_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("milestone_name", `${prefix} Milestone`);

    if ((apprCount ?? 0) === 0) {
      const { error: apprErr } = await admin
        .from("approval_scheduling_items")
        .insert({
          event_id: eventId,
          milestone_name: `${prefix} Milestone`,
          workflow_status: "in_queue",
          source: "campaign_builder",
          platforms: ["instagram"],
          caption_text: `${prefix} Pre-generated caption — no OpenAI call`,
        });
      if (apprErr) {
        console.warn(`  approval seed skipped: ${apprErr.message}`);
      }
    }
  }

  // Inbox thread (DB only — no Meta)
  const externalThreadId = `k6-${testRunId}-s${schoolIndex}`;
  const { data: existingThread } = await admin
    .from("inbox_threads")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_thread_id", externalThreadId)
    .maybeSingle();

  if (!existingThread) {
    const { error: inboxErr } = await admin.from("inbox_threads").insert({
      organization_id: organizationId,
      channel_type: "instagram_dm",
      external_thread_id: externalThreadId,
      status: "pending",
      unread_count: 1,
      metadata: { load_test_run_id: testRunId, synthetic: true },
    });
    if (inboxErr) {
      console.warn(`  inbox seed skipped: ${inboxErr.message}`);
    }
  }

  return {
    index: schoolIndex,
    name,
    organizationId,
    schoolYearId,
    eventIds,
    eventTitles,
    users,
  };
}

async function main() {
  console.log(
    `[seed] TEST_RUN_ID=${testRunId} schools=${schoolCount} url=${supabaseUrl}`,
  );

  const schools = [];
  for (const { index } of listSchools(schoolCount)) {
    process.stdout.write(`[seed] School ${index}/${schoolCount}… `);
    const seeded = await seedSchool(index);
    schools.push(seeded);
    console.log(`ok org=${seeded.organizationId}`);
  }

  const foreign = schools[1] || schools[0];
  const accounts = {
    testRunId,
    createdAt: new Date().toISOString(),
    passwordEnv: "K6_TEST_PASSWORD",
    schools: schools.map((s) => ({
      index: s.index,
      name: s.name,
      organizationId: s.organizationId,
      schoolYearId: s.schoolYearId,
      eventIds: s.eventIds,
      eventTitles: s.eventTitles,
      users: s.users.map((u) => ({
        key: u.key,
        email: u.email,
        userId: u.userId,
        campaignRole: u.campaignRole,
        orgRoleName: u.orgRoleName,
        label: u.label,
      })),
    })),
    foreignProbe: foreign
      ? {
          organizationId: foreign.organizationId,
          eventId: foreign.eventIds[0],
          eventTitle: foreign.eventTitles[0],
        }
      : null,
  };

  const outDir = resolve(k6Root(), "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "accounts.local.json");
  writeFileSync(outPath, JSON.stringify(accounts, null, 2));
  console.log(`[seed] Wrote ${outPath}`);
  console.log("[seed] Next: npm run test:load:mint-sessions");
}

main().catch((err) => {
  console.error("[seed] FAILED:", err.message || err);
  process.exit(1);
});
