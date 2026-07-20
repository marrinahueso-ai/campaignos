/** How long a team invite link stays valid. */
export const TEAM_INVITE_TTL_DAYS = 7;

export function computeInviteExpiresAt(from: Date = new Date()): string {
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + TEAM_INVITE_TTL_DAYS);
  return expires.toISOString();
}

export function isInviteExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) {
    return false;
  }
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) {
    return false;
  }
  return expiresMs <= Date.now();
}
