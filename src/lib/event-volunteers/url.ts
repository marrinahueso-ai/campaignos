const ALLOWED_HOSTS = new Set([
  "www.signupgenius.com",
  "signupgenius.com",
  "m.signupgenius.com",
]);

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^fc00:/i,
  /^fe80:/i,
];

export type ValidatedSignUpGeniusUrl = {
  href: string;
  normalizedHref: string;
  urlid: string;
  hostname: string;
};

export function validateSignUpGeniusUrl(
  raw: string,
): ValidatedSignUpGeniusUrl | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Enter a SignUpGenius URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: "That does not look like a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { error: "Use an https SignUpGenius link." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    return { error: "Only SignUpGenius links are supported." };
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return { error: "That URL is not allowed." };
  }

  const match = parsed.pathname.match(
    /^\/go\/([A-Za-z0-9][A-Za-z0-9-]{5,200})$/i,
  );
  if (!match?.[1]) {
    return {
      error:
        "Use a public SignUpGenius signup link (for example /go/…).",
    };
  }

  const urlid = match[1];
  const normalizedHref = `https://www.signupgenius.com/go/${urlid}`;

  return {
    href: parsed.toString(),
    normalizedHref,
    urlid,
    hostname: "www.signupgenius.com",
  };
}

export function truncateUrl(url: string, max = 42): string {
  if (url.length <= max) return url;
  const start = Math.max(12, Math.floor(max * 0.55));
  const end = Math.max(8, max - start - 1);
  return `${url.slice(0, start)}…${url.slice(-end)}`;
}
