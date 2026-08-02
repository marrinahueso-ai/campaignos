/**
 * Cross-machine lock for the 100-school-architecture seed/cleanup tools.
 *
 * Why not a real Postgres session-level advisory lock (pg_advisory_lock)?
 * Our seed/cleanup/validate scripts talk to Supabase exclusively through
 * PostgREST (the service-role `supabase-js` client), and PostgREST executes
 * every request on a short-lived connection from a pooled set — it does not
 * give REST callers a persistent session they can hold across dozens of
 * separate insert/select calls spread over several minutes. A session-scoped
 * `pg_advisory_lock()` acquired inside one PostgREST call would already be
 * released by the time the next call runs, making it useless for guarding a
 * multi-minute seed run. (`pg_advisory_xact_lock` has the same problem: it
 * only lives for one transaction, i.e. one PostgREST request.) Adding a new
 * SQL function/migration wouldn't fix this — it's a connection-model
 * limitation, not a missing-function problem.
 *
 * Instead we use "an equivalent database-backed lock" (explicitly allowed by
 * the hardening spec): a lock object in Supabase Storage. Storage objects are
 * themselves rows in Postgres (`storage.objects`) with a real unique
 * constraint on (bucket_id, name), so "create if absent" via `upload(...,
 * { upsert: false })` is atomic at the database level — not a local
 * filesystem lock, and safe across two machines because both talk to the
 * same Supabase project over the network.
 *
 * Lock identity = (projectRef, profile). Payload includes testRunId, pid,
 * host, acquiredAt, heartbeatAt, and which tool holds it (seed | cleanup).
 *
 * Staleness: a background heartbeat rewrites the lock object every 60s while
 * held. Any future acquire attempt that finds a lock whose heartbeatAt is
 * older than `staleAfterMs` (default 30 minutes — several times longer than
 * a full 100-school seed run, ~200s) treats it as abandoned (e.g. the holder
 * process crashed or was killed) and reclaims it automatically. Operators
 * can also force-clear a lock immediately with scripts/seed-unlock.mjs.
 */

import os from "node:os";

const LOCK_BUCKET = "training-library";
const LOCK_PREFIX = "_ops/seed-locks";
export const DEFAULT_STALE_MS = 30 * 60 * 1000;

export function lockPath(projectRef, profile) {
  return `${LOCK_PREFIX}/${projectRef}/${profile}.lock.json`;
}

async function readLock(admin, projectRef, profile) {
  const { data, error } = await admin.storage.from(LOCK_BUCKET).download(lockPath(projectRef, profile));
  if (error) {
    if (/not.?found|404/i.test(error.message || String(error.statusCode || ""))) return null;
    throw new Error(`seed-lock read failed: ${error.message}`);
  }
  try {
    return JSON.parse(await data.text());
  } catch {
    return null; // corrupt lock object — treat as absent, will be overwritten
  }
}

async function writeLock(admin, projectRef, profile, payload, { upsert }) {
  const body = JSON.stringify(payload, null, 2);
  const { error } = await admin.storage
    .from(LOCK_BUCKET)
    .upload(lockPath(projectRef, profile), new Blob([body], { type: "application/json" }), {
      upsert,
      contentType: "application/json",
    });
  if (error) throw error;
}

async function deleteLock(admin, projectRef, profile) {
  await admin.storage.from(LOCK_BUCKET).remove([lockPath(projectRef, profile)]);
}

function isStale(lock, staleAfterMs) {
  const last = Date.parse(lock.heartbeatAt || lock.acquiredAt || "");
  return !Number.isFinite(last) || Date.now() - last > staleAfterMs;
}

function describeLock(lock) {
  const ageMin = Math.round((Date.now() - Date.parse(lock.heartbeatAt || lock.acquiredAt)) / 60000);
  return (
    `heldBy=${lock.heldBy || "seed"} testRunId=${lock.testRunId} pid=${lock.pid} ` +
    `host=${lock.host} age=~${ageMin}m`
  );
}

function isConflictError(err) {
  return /exists|duplicate|409|resource already exists/i.test(err?.message || String(err));
}

/**
 * Acquire the lock or throw immediately (fail-fast). Returns a handle with
 * a `.release()` method — always call it in a `finally` block.
 */
export async function acquireSeedLock(
  admin,
  { projectRef, profile, testRunId, heldBy = "seed", staleAfterMs = DEFAULT_STALE_MS },
) {
  const payload = {
    projectRef,
    profile,
    testRunId,
    heldBy,
    pid: process.pid,
    host: os.hostname(),
    acquiredAt: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
  };

  const tryCreate = () => writeLock(admin, projectRef, profile, payload, { upsert: false });

  try {
    await tryCreate();
  } catch (err) {
    if (!isConflictError(err)) throw new Error(`seed-lock acquire failed: ${err.message || err}`);

    const existing = await readLock(admin, projectRef, profile);
    if (existing && !isStale(existing, staleAfterMs)) {
      throw new Error(
        `[seed-lock] Refusing to start: an active lock is already held for project=${projectRef} ` +
          `profile=${profile} (${describeLock(existing)}). If you are certain the holder crashed and this ` +
          `is truly stale, clear it with: SEED_FORCE_UNLOCK=true node --env-file=.env.staging.local ` +
          `load-tests/k6/scripts/seed-unlock.mjs (requires TEST_RUN_ID + SEED_PROFILE=${profile}). ` +
          `Locks also self-clear automatically once idle for ${Math.round(staleAfterMs / 60000)} minutes.`,
      );
    }

    // Stale (or vanished between our failed create and this read) — reclaim once.
    console.warn(
      existing
        ? `[seed-lock] Found stale lock (${describeLock(existing)}) — reclaiming.`
        : `[seed-lock] Lock object vanished after conflict — retrying create.`,
    );
    try {
      await writeLock(admin, projectRef, profile, payload, { upsert: true });
    } catch (err2) {
      throw new Error(
        `[seed-lock] Failed to reclaim stale lock for project=${projectRef} profile=${profile}: ` +
          `${err2.message || err2}. Another process may have reclaimed it first — retry shortly.`,
      );
    }
  }

  console.log(`[seed-lock] Acquired (${heldBy}) project=${projectRef} profile=${profile} testRunId=${testRunId} pid=${payload.pid}`);

  let released = false;
  const heartbeatTimer = setInterval(() => {
    payload.heartbeatAt = new Date().toISOString();
    writeLock(admin, projectRef, profile, payload, { upsert: true }).catch((err) => {
      console.warn(`[seed-lock] heartbeat write failed (non-fatal): ${err.message || err}`);
    });
  }, 60_000);
  heartbeatTimer.unref?.();

  return {
    async release() {
      if (released) return;
      released = true;
      clearInterval(heartbeatTimer);
      try {
        const current = await readLock(admin, projectRef, profile);
        if (current && current.pid === payload.pid && current.acquiredAt === payload.acquiredAt) {
          await deleteLock(admin, projectRef, profile);
          console.log(`[seed-lock] Released project=${projectRef} profile=${profile}`);
        } else {
          console.warn(
            "[seed-lock] Not releasing — the stored lock no longer matches this process " +
              "(likely already cleared or reclaimed by another run).",
          );
        }
      } catch (err) {
        console.warn(`[seed-lock] release failed (non-fatal, lock will self-clear via staleness): ${err.message || err}`);
      }
    },
  };
}

/** Read-only status check for preflight tooling — never writes. */
export async function checkSeedLockStatus(admin, { projectRef, profile, staleAfterMs = DEFAULT_STALE_MS }) {
  const existing = await readLock(admin, projectRef, profile);
  if (!existing) return { active: false, detail: "no lock object present" };
  const stale = isStale(existing, staleAfterMs);
  return {
    active: !stale,
    stale,
    lock: existing,
    detail: stale ? `stale lock present (${describeLock(existing)}) — will self-clear on next acquire` : describeLock(existing),
  };
}

/** Force-clear a lock unconditionally. Used only by scripts/seed-unlock.mjs. */
export async function forceClearSeedLock(admin, { projectRef, profile }) {
  await deleteLock(admin, projectRef, profile);
}
