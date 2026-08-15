/**
 * Repair facebook_comment / instagram_comment threads missing participant_avatar_url.
 * Fetches Graph profile pictures; falls back to any sibling thread (same participant id
 * or same display name) that already has an avatar (e.g. DM row for the same contact).
 *
 * Usage:
 *   node --env-file=.env.local scripts/repair-inbox-comment-avatars.mjs [organizationId]
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

function readAvatar(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = metadata.participant_avatar_url;
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

async function fetchAvatarUrl(pageAccessToken, participantId, preferInstagram) {
  if (preferInstagram) {
    try {
      const ig = await graphGet(`/${participantId}`, {
        fields: "profile_picture_url",
        access_token: pageAccessToken,
      });
      if (typeof ig.profile_picture_url === "string" && ig.profile_picture_url.trim()) {
        return ig.profile_picture_url.trim();
      }
    } catch {
      // fall through to Facebook fields
    }
  }

  const profile = await graphGet(`/${participantId}`, {
    fields: "profile_pic,picture.type(large)",
    access_token: pageAccessToken,
  });
  return (
    (typeof profile.profile_pic === "string" && profile.profile_pic.trim()) ||
    (typeof profile.picture?.data?.url === "string" && profile.picture.data.url.trim()) ||
    null
  );
}

async function main() {
  const admin = createClient(url, key);

  const { data: connection, error: connError } = await admin
    .from("organization_meta_connections")
    .select("facebook_page_id, page_access_token")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (connError || !connection) {
    throw new Error(connError?.message || "Meta connection not found");
  }

  const pageAccessToken = decryptOAuthToken(connection.page_access_token);

  const { data: threads, error: threadsError } = await admin
    .from("inbox_threads")
    .select(
      "id, channel_type, participant_name, participant_external_id, metadata, last_message_snippet, subject",
    )
    .eq("organization_id", organizationId);

  if (threadsError) {
    throw new Error(threadsError.message);
  }

  const all = threads ?? [];
  const avatarByParticipantId = new Map();
  const avatarByName = new Map();

  for (const thread of all) {
    const avatar = readAvatar(thread.metadata);
    if (!avatar) continue;
    const pid = thread.participant_external_id?.trim();
    if (pid) avatarByParticipantId.set(pid, avatar);
    const name = thread.participant_name?.trim()?.toLowerCase();
    if (name) avatarByName.set(name, avatar);
  }

  const commentThreads = all.filter(
    (row) =>
      row.channel_type === "facebook_comment" ||
      row.channel_type === "instagram_comment" ||
      row.channel_type === "facebook_tag" ||
      row.channel_type === "instagram_tag",
  );

  const missing = commentThreads.filter((row) => !readAvatar(row.metadata));
  console.log(
    `Org ${organizationId}: ${missing.length} comment/tag thread(s) missing avatar`,
  );

  let repaired = 0;
  for (const thread of missing) {
    const pid = thread.participant_external_id?.trim() || null;
    const nameKey = thread.participant_name?.trim()?.toLowerCase() || null;
    let avatarUrl =
      (pid && avatarByParticipantId.get(pid)) ||
      (nameKey && avatarByName.get(nameKey)) ||
      null;

    if (!avatarUrl && pid) {
      try {
        avatarUrl = await fetchAvatarUrl(
          pageAccessToken,
          pid,
          thread.channel_type.startsWith("instagram"),
        );
      } catch (error) {
        console.warn(
          `Graph avatar failed for ${thread.id} (${pid}):`,
          error.message,
        );
      }
    }

    if (!avatarUrl) {
      console.warn(
        `No avatar for ${thread.id} (${thread.participant_name} / ${thread.last_message_snippet})`,
      );
      continue;
    }

    const metadata = {
      ...(thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}),
      participant_avatar_url: avatarUrl,
    };

    const { error: updateError } = await admin
      .from("inbox_threads")
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", thread.id);

    if (updateError) {
      console.error(`Update failed for ${thread.id}:`, updateError.message);
      continue;
    }

    repaired += 1;
    if (pid) avatarByParticipantId.set(pid, avatarUrl);
    if (nameKey) avatarByName.set(nameKey, avatarUrl);
    console.log(
      `Repaired ${thread.id}: ${thread.participant_name} — ${thread.last_message_snippet ?? thread.subject ?? ""}`,
    );
  }

  console.log(`Done. Repaired ${repaired} thread(s).`);

  const { data: ricardoComments } = await admin
    .from("inbox_threads")
    .select("id, participant_name, last_message_snippet, metadata")
    .eq("organization_id", organizationId)
    .eq("channel_type", "facebook_comment")
    .ilike("participant_name", "%ricardo%");

  for (const row of ricardoComments ?? []) {
    console.log(
      "Ricardo comment:",
      row.id,
      row.last_message_snippet,
      readAvatar(row.metadata) ? "has avatar" : "NO avatar",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
