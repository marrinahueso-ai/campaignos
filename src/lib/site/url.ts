/** Canonical production site — used when env vars and request host are absent or legacy. */
export const DEFAULT_SITE_URL = "https://heyralli.com";

/** Old Vercel production hostname — 301 to DEFAULT_SITE_URL in middleware. */
export const LEGACY_VERCEL_HOSTS = new Set(["campaignos-six.vercel.app"]);

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function normalizeSiteOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (isLocalHostname(url.hostname)) {
      return stripTrailingSlash(origin);
    }
    if (isLegacyVercelHost(url.hostname) || isVercelAppHost(url.hostname)) {
      return DEFAULT_SITE_URL;
    }
  } catch {
    // keep configured string when it is not a full URL
  }
  return stripTrailingSlash(origin);
}

export function getConfiguredSiteUrl(): string | null {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  return configured ? normalizeSiteOrigin(configured) : null;
}

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

export function isLegacyVercelHost(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  return LEGACY_VERCEL_HOSTS.has(host);
}

export function shouldRedirectToPrimaryDomain(host: string | null): boolean {
  if (!host) {
    return false;
  }
  return isLegacyVercelHost(host);
}

function isVercelAppHost(hostname: string): boolean {
  return hostname.toLowerCase().split(":")[0].endsWith(".vercel.app");
}

/**
 * Security: never blindly reflect an incoming Origin/Host header back into a
 * URL — a spoofed `Host`/`X-Forwarded-Host` on a request that triggers an
 * emailed link (invite, magic link, founding-access) would otherwise let an
 * attacker redirect a real user's auth token to an attacker-controlled
 * domain. Only recognized hostnames (local dev, this Vercel project's
 * preview domains, the legacy production host, and the configured public
 * site URL) are ever echoed back; anything else falls through to the
 * configured/default site URL.
 */
function isAllowedRequestHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  if (isLocalHostname(host)) return true;
  if (isLegacyVercelHost(host)) return true;
  if (isVercelAppHost(host)) return true;

  const configured = getConfiguredSiteUrl();
  if (configured) {
    try {
      if (new URL(configured).hostname.toLowerCase() === host) {
        return true;
      }
    } catch {
      // configured value isn't a full URL — ignore
    }
  }

  try {
    if (new URL(DEFAULT_SITE_URL).hostname.toLowerCase() === host) {
      return true;
    }
  } catch {
    // unreachable — DEFAULT_SITE_URL is a constant valid URL
  }

  return false;
}

/**
 * Prefer the incoming request origin/host, then configured public site URL.
 * Legacy Vercel hostnames always resolve to heyralli.com. Unrecognized
 * hostnames (potential Host-header spoofing) never get reflected back.
 */
export function resolveSiteOrigin(requestOrigin?: string | null): string {
  const origin = requestOrigin?.trim();
  if (origin) {
    try {
      const url = new URL(origin);
      if (isLocalHostname(url.hostname)) {
        return stripTrailingSlash(origin);
      }
      if (isLegacyVercelHost(url.hostname) || isVercelAppHost(url.hostname)) {
        return DEFAULT_SITE_URL;
      }
      if (isAllowedRequestHostname(url.hostname)) {
        return stripTrailingSlash(origin);
      }
      // Unrecognized host — fall through to configured/default below.
    } catch {
      // fall through to configured/default
    }
  }

  const configured = getConfiguredSiteUrl();
  if (configured) {
    return configured;
  }

  return DEFAULT_SITE_URL;
}

/** Resolve site origin from proxy headers (server actions, background jobs). */
export function resolveSiteUrlFromHeaders(
  host: string | null,
  proto: string | null = "https",
): string {
  if (host) {
    const hostname = host.split(":")[0];
    if (isLocalHostname(hostname)) {
      const scheme = proto?.trim() || "http";
      return stripTrailingSlash(`${scheme}://${host}`);
    }
    if (isLegacyVercelHost(hostname) || isVercelAppHost(hostname)) {
      return DEFAULT_SITE_URL;
    }
    if (isAllowedRequestHostname(hostname)) {
      const scheme = proto?.trim() || "https";
      return stripTrailingSlash(`${scheme}://${host}`);
    }
    // Unrecognized host — fall through to configured/default below.
  }

  const configured = getConfiguredSiteUrl();
  if (configured) {
    return configured;
  }

  return DEFAULT_SITE_URL;
}

export function getSiteMetadataBase(): URL {
  return new URL(getConfiguredSiteUrl() ?? DEFAULT_SITE_URL);
}
