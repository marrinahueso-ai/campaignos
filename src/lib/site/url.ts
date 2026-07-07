/** Canonical production site — used when env vars and request host are absent or legacy. */
export const DEFAULT_SITE_URL = "https://heyralli.com";

/** Old Vercel production hostname — 301 to DEFAULT_SITE_URL in middleware. */
export const LEGACY_VERCEL_HOSTS = new Set(["campaignos-six.vercel.app"]);

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function getConfiguredSiteUrl(): string | null {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  return configured ? stripTrailingSlash(configured) : null;
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
 * Prefer configured public site URL, then heyralli.com for legacy/Vercel hosts.
 * Request origin is only used for local development.
 */
export function resolveSiteOrigin(requestOrigin?: string | null): string {
  const configured = getConfiguredSiteUrl();
  if (configured) {
    return configured;
  }

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
      return stripTrailingSlash(origin);
    } catch {
      // fall through to default
    }
  }

  return DEFAULT_SITE_URL;
}

/** Resolve site origin from proxy headers (server actions, background jobs). */
export function resolveSiteUrlFromHeaders(
  host: string | null,
  proto: string | null = "https",
): string {
  const configured = getConfiguredSiteUrl();
  if (configured) {
    return configured;
  }

  if (host) {
    const hostname = host.split(":")[0];
    if (isLocalHostname(hostname)) {
      const scheme = proto?.trim() || "http";
      return stripTrailingSlash(`${scheme}://${host}`);
    }
    if (isLegacyVercelHost(hostname) || isVercelAppHost(hostname)) {
      return DEFAULT_SITE_URL;
    }
    const scheme = proto?.trim() || "https";
    return stripTrailingSlash(`${scheme}://${host}`);
  }

  return DEFAULT_SITE_URL;
}

export function getSiteMetadataBase(): URL {
  return new URL(getConfiguredSiteUrl() ?? DEFAULT_SITE_URL);
}
