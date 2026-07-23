import { safeNextPath } from "@/lib/auth/safe-next-path";

export const SCHOOL_SETUP_PATH = "/settings/school-setup";
/** Value-first first-time onboarding (Welcome → create event). */
export const ONBOARDING_PATH = "/onboarding";
export const DEFAULT_AUTH_PATH = "/dashboard";

/** Known login errors with dedicated UI copy. */
export const LOGIN_PAGE_ERRORS = [
  "existing_org",
  "auth",
  "code_required",
  "org_required",
  "invite_email",
  "account_deactivated",
] as const;

export type LoginPageError = (typeof LOGIN_PAGE_ERRORS)[number];

export function isLoginPageError(
  error: string | null | undefined,
): error is LoginPageError {
  return (
    error !== null &&
    error !== undefined &&
    (LOGIN_PAGE_ERRORS as readonly string[]).includes(error as LoginPageError)
  );
}

/** Any /login?error=… URL must render without middleware or page redirects. */
export function shouldAllowAuthenticatedLoginView(error?: string | null) {
  return Boolean(error?.trim());
}

export function resolveAuthenticatedAppPath(
  hasOrganization: boolean,
  next?: string | null,
  options?: { pendingSetup?: boolean },
): string {
  if (options?.pendingSetup) {
    return ONBOARDING_PATH;
  }

  if (!hasOrganization) {
    return ONBOARDING_PATH;
  }

  return safeNextPath(next) ?? DEFAULT_AUTH_PATH;
}
