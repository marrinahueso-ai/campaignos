import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export type SafeOutboundUrlOptions = {
  /** When false (default), only https is allowed. */
  allowHttp?: boolean;
  /**
   * If set, the hostname must match one of these (exact or leading `*.`).
   * Example: `["*.supabase.co", "calendar.google.com"]`.
   */
  allowedHostPatterns?: string[];
};

export type SafeOutboundUrlResult =
  | { ok: true; url: URL }
  | { ok: false; error: string };

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function hostMatchesPattern(hostname: string, pattern: string): boolean {
  const host = normalizeHostname(hostname);
  const pat = normalizeHostname(pattern);
  if (pat.startsWith("*.")) {
    const suffix = pat.slice(1); // ".example.com"
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === pat;
}

/** True for loopback, RFC1918, link-local, CGNAT, and unique-local IPv6. */
export function isBlockedIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = parts as [number, number, number, number];
    if (a === 0) return true; // "this" network
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
      return true; // link-local fe80::/10
    }
    // IPv4-mapped IPv6 (::ffff:a.b.c.d)
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isBlockedIpAddress(mapped[1]);
    return false;
  }

  return true;
}

export function assertSafeOutboundUrl(
  raw: string,
  options: SafeOutboundUrlOptions = {},
): SafeOutboundUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "URL is required." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid URL." };
  }

  const allowHttp = options.allowHttp === true;
  if (url.protocol === "https:") {
    // ok
  } else if (url.protocol === "http:" && allowHttp) {
    // ok
  } else {
    return {
      ok: false,
      error: allowHttp
        ? "URL must use http or https."
        : "URL must use https.",
    };
  }

  if (url.username || url.password) {
    return { ok: false, error: "URL must not include credentials." };
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) {
    return { ok: false, error: "URL hostname is required." };
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    return { ok: false, error: "That host is not allowed." };
  }

  if (isIP(hostname) && isBlockedIpAddress(hostname)) {
    return { ok: false, error: "That address is not allowed." };
  }

  if (options.allowedHostPatterns?.length) {
    const allowed = options.allowedHostPatterns.some((pattern) =>
      hostMatchesPattern(hostname, pattern),
    );
    if (!allowed) {
      return { ok: false, error: "That host is not allowed." };
    }
  }

  return { ok: true, url };
}

/**
 * Resolve hostname and reject private / metadata addresses (DNS rebinding defense).
 * Literal IPs are checked without DNS.
 */
export async function assertSafeOutboundUrlResolved(
  raw: string,
  options: SafeOutboundUrlOptions = {},
): Promise<SafeOutboundUrlResult> {
  const base = assertSafeOutboundUrl(raw, options);
  if (!base.ok) return base;

  const hostname = normalizeHostname(base.url.hostname);
  if (isIP(hostname)) {
    return base;
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!records.length) {
      return { ok: false, error: "Unable to resolve host." };
    }
    for (const record of records) {
      if (isBlockedIpAddress(record.address)) {
        return { ok: false, error: "That host resolves to a private address." };
      }
    }
  } catch {
    return { ok: false, error: "Unable to resolve host." };
  }

  return base;
}

/** Host patterns for this project's Supabase Storage public/sign URLs. */
export function supabaseStorageHostPatterns(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return ["*.supabase.co"];
  try {
    const host = new URL(raw).hostname;
    return host ? [host] : ["*.supabase.co"];
  } catch {
    return ["*.supabase.co"];
  }
}
