import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * At-rest encryption for third-party OAuth tokens (Meta page tokens, Canva /
 * Google Calendar / Monday access + refresh tokens) that are otherwise
 * stored as plain `text` columns. A DB dump, backup leak, or overly broad
 * service-role query would hand out live tokens for every connected
 * integration — AES-256-GCM at the application layer means the ciphertext
 * alone (without OAUTH_TOKEN_ENCRYPTION_KEY, which only exists in the
 * server environment, never the database) is useless.
 *
 * Backward compatible by design: `decryptOAuthToken` returns any value
 * without the `encv1:` prefix unchanged, so rows written before this key was
 * configured keep working and are transparently re-encrypted the next time
 * their connection is refreshed/reconnected — no bulk migration required.
 * If the key isn't configured at all, `encryptOAuthToken` stores tokens
 * unencrypted (previous behavior) rather than breaking OAuth connect flows.
 */

const ALGORITHM = "aes-256-gcm";
const VERSION_PREFIX = "encv1";
const IV_LENGTH_BYTES = 12;

let warnedMissingKey = false;
let warnedInvalidKey = false;

function loadEncryptionKey(): Buffer | null {
  const raw = process.env.OAUTH_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    return null;
  }

  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) {
      if (!warnedInvalidKey) {
        warnedInvalidKey = true;
        console.error(
          "[token-encryption] OAUTH_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded). Ignoring it.",
        );
      }
      return null;
    }
    return buf;
  } catch {
    return null;
  }
}

/** Encrypts a token for storage. Returns the plaintext unchanged if no key is configured. */
export function encryptOAuthToken(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = loadEncryptionKey();
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[token-encryption] OAUTH_TOKEN_ENCRYPTION_KEY not configured — OAuth provider tokens are being stored unencrypted. Set OAUTH_TOKEN_ENCRYPTION_KEY to encrypt them at rest.",
      );
    }
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a stored token. Values without the `encv1:` prefix are treated as
 * legacy plaintext (or were written while no key was configured) and are
 * returned unchanged. Returns an empty string if decryption fails so a
 * corrupt/undecryptable row degrades to "not connected" rather than
 * throwing and taking down the caller.
 */
export function decryptOAuthToken(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith(`${VERSION_PREFIX}:`)) {
    return stored;
  }

  const key = loadEncryptionKey();
  if (!key) {
    console.error(
      "[token-encryption] Cannot decrypt a stored OAuth token: OAUTH_TOKEN_ENCRYPTION_KEY is not configured.",
    );
    return "";
  }

  const parts = stored.split(":");
  if (parts.length !== 4) {
    console.error("[token-encryption] Stored OAuth token has an unrecognized format.");
    return "";
  }

  try {
    const [, ivB64, authTagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch (err) {
    console.error("[token-encryption] Failed to decrypt a stored OAuth token:", err);
    return "";
  }
}
