#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionsPath = resolve(__dirname, "../data/sessions.100-school-architecture.local.json");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.K6_TEST_PASSWORD;
const ACTIVE_ORG_COOKIE = "campaignos-active-organization-id";
const count = Number(process.env.PINNED_OWNER_COUNT || "75");

function stringToBase64URL(str) {
  return Buffer.from(str, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
const MAX_CHUNK = 3180;
function createChunks(key, value) {
  const encoded = encodeURIComponent(value);
  if (encoded.length <= MAX_CHUNK) return [{ name: key, value }];
  const chunks = [];
  for (let i = 0, n = 0; i < encoded.length; i += MAX_CHUNK, n++) {
    chunks.push({ name: `${key}.${n}`, value: encoded.slice(i, i + MAX_CHUNK) });
  }
  return chunks;
}
async function signInWithRetry(email, attempts = 6) {
  for (let i = 1; i <= attempts; i++) {
    const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (!error && data.session) return data;
    const msg = error?.message || "no session";
    if (!/rate limit/i.test(msg) || i === attempts) throw new Error(msg);
    await new Promise((r) => setTimeout(r, Math.min(30_000, 5_000 * i)));
  }
  throw new Error("unreachable");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const storageKey = `sb-${projectRef}-auth-token`;
const fixture = JSON.parse(readFileSync(sessionsPath, "utf8"));
const targets = fixture.sessions.filter((s) => s.role === "owner" && Number(s.schoolIndex) >= 1 && Number(s.schoolIndex) <= count);
if (targets.length !== count) { console.error(`Expected ${count} owners; found ${targets.length}`); process.exit(1); }
const byEmail = new Map(fixture.sessions.map((s) => [s.email, s]));
let ok = 0;
for (const target of targets) {
  const data = await signInWithRetry(target.email);
  const sessionPayload = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  };
  const value = `base64-${stringToBase64URL(JSON.stringify(sessionPayload))}`;
  const cookieParts = createChunks(storageKey, value).map((c) => `${c.name}=${c.value}`);
  cookieParts.push(`${ACTIVE_ORG_COOKIE}=${target.organizationId}`);
  Object.assign(byEmail.get(target.email), { cookie: cookieParts.join("; "), userId: data.session.user.id, mintedAt: new Date().toISOString() });
  ok += 1;
  console.log(`[remint] school ${String(target.schoolIndex).padStart(3, "0")} ok`);
  await new Promise((r) => setTimeout(r, 2200));
}
fixture.mintedAt = new Date().toISOString();
writeFileSync(sessionsPath, JSON.stringify(fixture, null, 2));
console.log(`[remint] updated ${ok}/${count}`);
