import "server-only";

import { cookies } from "next/headers";
import {
  PENDING_FOUNDING_ACCESS_COOKIE,
  pendingFoundingAccessCookieOptions,
  resolveFoundingAccess,
  type FoundingAccessResolution,
} from "@/lib/auth/founding-access";

export async function setPendingFoundingAccessCookie(code: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    PENDING_FOUNDING_ACCESS_COOKIE,
    code.trim().toUpperCase(),
    pendingFoundingAccessCookieOptions(),
  );
}

export async function getPendingFoundingAccessCode(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(PENDING_FOUNDING_ACCESS_COOKIE)?.value?.trim();
  return value ? value.toUpperCase() : null;
}

export async function clearPendingFoundingAccessCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_FOUNDING_ACCESS_COOKIE);
}

export async function resolvePendingFoundingAccess(): Promise<FoundingAccessResolution> {
  const pendingCode = await getPendingFoundingAccessCode();
  return resolveFoundingAccess(pendingCode, { required: true });
}
