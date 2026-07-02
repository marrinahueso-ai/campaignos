#!/usr/bin/env node
/**
 * Apply migration 014 via direct Postgres connection.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres" \
 *     node scripts/apply-migration-014.mjs
 *
 * Or set DATABASE_URL with the same connection string.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Missing SUPABASE_DB_URL or DATABASE_URL.\n" +
      "Get the connection string from Supabase → Project Settings → Database → URI.",
  );
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), "supabase/migrations/014_creative_director.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Applying migration 014…");
  await client.query(sql);
  console.log("Migration 014 applied successfully.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
