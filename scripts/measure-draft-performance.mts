/**
 * One-shot AI draft performance measurement (Engine 15 diagnostic).
 * Usage: npx tsx scripts/measure-draft-performance.mts
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import Module from "module";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1]!.trim()] = match[2]!.trim().replace(/^["']|["']$/g, "");
  }
}

const originalLoad = Module._load as (
  request: string,
  parent: Module,
  isMain: boolean,
) => unknown;

Module._load = function (request, parent, isMain) {
  if (request === "next/headers") {
    return {
      cookies: async () => ({
        getAll: () => [],
        set: () => undefined,
      }),
    };
  }
  if (request === "next/cache") {
    return { revalidatePath: () => undefined };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const { data: event } = await supabase
  .from("events")
  .select("id, title")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (!event) {
  console.error("No events found in database.");
  process.exit(1);
}

const { data: item } = await supabase
  .from("communication_items")
  .select("id, channel")
  .eq("event_id", event.id)
  .limit(1)
  .maybeSingle();

if (!item) {
  console.error("No communication items found for event:", event.id);
  process.exit(1);
}

console.info("Measuring draft for:", {
  eventId: event.id,
  eventTitle: event.title,
  communicationItemId: item.id,
  channel: item.channel,
});

const { draftCommunicationWithAi } = await import("../src/lib/ai/draft.ts");

const result = await draftCommunicationWithAi({
  eventId: event.id,
  communicationItemId: item.id,
  channel: item.channel,
});

console.info("Draft result:", {
  success: result.success,
  error: result.error,
  versionNumber: result.versionNumber,
});
