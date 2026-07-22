import "server-only";

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function getDeveloperAgreementOwnerEmails(): string[] {
  return parseEmailList(
    process.env.HEY_RALLI_OWNER_EMAILS ||
      process.env.REPORT_A_PROBLEM_OWNER_EMAILS,
  );
}

export function getAgreementsSiteOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
