/**
 * Repair inbox threads whose participant_name was clobbered to "User NNNNN"
 * by webhook upserts. Re-reads Facebook/IG conversation participants via Graph
 * and restores name + avatar metadata.
 *
 * Usage:
 *   node --env-file=.env.local scripts/repair-inbox-participant-names.mjs [organizationId]
 */
import { createDecipheriv } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const VERSION_PREFIX = "encv1";
const ALGORITHM = "aes-256-gcm";
const organizationId =
  process.argv[2]?.trim() || "d88b2f96-b924-4bd5-b6e2-40ad8ee84592";
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function decryptOAuthToken(value) {
  if (!value || !value.startsWith(`${VERSION_PREFIX}:`)) {
    return value;
  }
  const rawKey = process.env.OAUTH_TOKEN_ENCRYPTION_KEY?.trim();
  if (!rawKey) {
    throw new Error("Encrypted token but OAUTH_TOKEN_ENCRYPTION_KEY missing");
  }
  const encKey = Buffer.from(rawKey, "base64");
  const parts = value.split(":");
  // encv1:iv:authTag:ciphertext (base64)
  if (parts.length !== 4) {
    throw new Error("Unexpected encrypted token format");
  }
  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const ciphertext = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv(ALGORITHM, encKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}

function isGenericName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return true;
  if (/^(Messenger|Facebook|Instagram) user$/i.test(trimmed)) return true;
  return /^User \d+$/i.test(trimmed);
}

async function graphGet(path, params) {
  const endpoint = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) {
    endpoint.searchParams.set(k, v);
  }
  const response = await fetch(endpoint);
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(
      payload.error?.message || `Graph error ${response.status} for ${path}`,
    );
  }
  return payload;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
}

async function main() {
  const admin = createClient(url, key);

  const { data: connection, error: connError } = await admin
    .from("organization_meta_connections")
    .select(
      "facebook_page_id, instagram_account_id, page_access_token, page_name",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (connError || !connection) {
    throw new Error(connError?.message || "Meta connection not found");
  }

  const pageAccessToken = decryptOAuthToken(connection.page_access_token);
  const pageId = connection.facebook_page_id;

  const { data: threads, error: threadsError } = await admin
    .from("inbox_threads")
    .select(
      "id, channel_type, external_thread_id, participant_name, participant_external_id, metadata",
    )
    .eq("organization_id", organizationId)
    .in("channel_type", ["facebook_message", "instagram_dm"]);

  if (threadsError) {
    throw new Error(threadsError.message);
  }

  const damaged = (threads ?? []).filter((row) =>
    isGenericName(row.participant_name),
  );
  console.log(`Found ${damaged.length} generic-named DM thread(s)`);

  const conversations = await graphGet(`/${pageId}/conversations`, {
    platform: "messenger",
    fields: "id,participants{id,name,username,email}",
    limit: "50",
    access_token: pageAccessToken,
  });

  const byConversationId = new Map();
  const byParticipantId = new Map();
  for (const conversation of asArray(conversations.data ?? conversations)) {
    const conversationId = conversation.id;
    const participants = asArray(conversation.participants);
    const participant = participants.find((entry) => entry.id !== pageId);
    if (!conversationId || !participant) continue;
    const name =
      participant.name || participant.username || participant.email || null;
    const profile = {
      name,
      participantId: participant.id,
    };
    byConversationId.set(conversationId, profile);
    if (participant.id) {
      byParticipantId.set(participant.id, profile);
    }
  }

  let repaired = 0;
  for (const thread of damaged) {
    const fromConv =
      byConversationId.get(thread.external_thread_id) ||
      byParticipantId.get(thread.participant_external_id);

    let name = fromConv?.name ?? null;
    let avatarUrl = null;
    const psid = fromConv?.participantId || thread.participant_external_id;

    if (psid) {
      try {
        const profile = await graphGet(`/${psid}`, {
          fields: "name,first_name,last_name,profile_pic,picture.type(large)",
          access_token: pageAccessToken,
        });
        const combined = [profile.first_name, profile.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        name = profile.name || combined || profile.first_name || name;
        avatarUrl =
          profile.profile_pic ||
          profile.picture?.data?.url ||
          null;
      } catch (error) {
        console.warn(`Profile fetch failed for ${psid}:`, error.message);
      }
    }

    if (!name || isGenericName(name)) {
      console.warn(
        `Could not resolve real name for thread ${thread.id} (${thread.participant_name})`,
      );
      continue;
    }

    const metadata = {
      ...(thread.metadata && typeof thread.metadata === "object"
        ? thread.metadata
        : {}),
    };
    if (avatarUrl) {
      metadata.participant_avatar_url = avatarUrl;
    }

    const { error: updateError } = await admin
      .from("inbox_threads")
      .update({
        participant_name: name,
        participant_external_id: psid || thread.participant_external_id,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", thread.id);

    if (updateError) {
      console.error(`Update failed for ${thread.id}:`, updateError.message);
      continue;
    }

    repaired += 1;
    console.log(`Repaired ${thread.id}: ${thread.participant_name} → ${name}`);
  }

  const { data: ricardo } = await admin
    .from("inbox_threads")
    .select("id, participant_name, metadata, last_message_snippet")
    .eq("id", "7bd84ca9-7257-4fbf-b6bf-df69f061e975")
    .maybeSingle();

  console.log(`Done. Repaired ${repaired} thread(s).`);
  console.log("Ricardo thread:", JSON.stringify(ricardo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
