import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const contents = readFileSync(envPath, "utf8");
  const vars = {};

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    vars[key] = rest.join("=");
  }

  return vars;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: existing, error: readError } = await supabase
  .from("events")
  .select("id, title, date, status")
  .order("date", { ascending: true });

if (readError) {
  console.error("READ_FAILED:", readError.message);
  process.exit(1);
}

console.log("READ_OK:", existing?.length ?? 0, "event(s)");

if (!existing?.length) {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 3);
  const date = futureDate.toISOString().split("T")[0];

  const { data: created, error: insertError } = await supabase
    .from("events")
    .insert({
      title: "Spring Carnival 2026",
      description:
        "Family fun day with games, food, and raffle prizes. Volunteers welcome!",
      date,
      time: "17:00:00",
      location: "School gymnasium",
      audience: "Families and community",
      theme: "Spring celebration",
      status: "scheduled",
    })
    .select("id, title, date, status")
    .single();

  if (insertError) {
    console.error("INSERT_FAILED:", insertError.message);
    process.exit(1);
  }

  console.log("INSERT_OK:", created);
} else {
  console.log("SAMPLE_SKIPPED: table already has data");
  for (const event of existing) {
    console.log(" -", event.title, event.date, event.status);
  }
}
