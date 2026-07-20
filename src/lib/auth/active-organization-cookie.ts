import "server-only";

import { cookies } from "next/headers";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  activeOrganizationCookieOptions,
  normalizeOrganizationId,
} from "@/lib/auth/active-organization";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function readActiveOrganizationCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return normalizeOrganizationId(
    cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value,
  );
}

export async function writeActiveOrganizationCookie(
  organizationId: string,
): Promise<void> {
  const normalized = normalizeOrganizationId(organizationId);
  if (!normalized) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ACTIVE_ORGANIZATION_COOKIE,
    normalized,
    activeOrganizationCookieOptions(THIRTY_DAYS),
  );
}

export async function clearActiveOrganizationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, "", {
    ...activeOrganizationCookieOptions(0),
    maxAge: 0,
  });
}
