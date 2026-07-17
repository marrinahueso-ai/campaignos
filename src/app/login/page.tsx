import { getAuthUser } from "@/lib/auth/queries";
import { getInvitePreview } from "@/lib/auth/invite-preview";
import {
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import {
  getAuthenticatedAppPath,
  shouldAllowAuthenticatedLoginView,
  SCHOOL_SETUP_PATH,
} from "@/lib/auth/post-auth-path";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { redirect } from "next/navigation";
import { StudioHomePage } from "@/components/marketing/StudioHomePage";

export const metadata = {
  title: "Sign in",
};

interface LoginPageProps {
  searchParams: Promise<{
    invite?: string;
    error?: string;
    next?: string;
    intent?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const setupIntent = params.intent === "setup";
  const nextPath =
    safeNextPath(params.next) ?? (setupIntent ? SCHOOL_SETUP_PATH : null);

  const user = await getAuthUser();
  const pendingCode = user ? await getPendingFoundingAccessCode() : null;
  const hasValidPendingCode =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);
  const needsFoundingCodeRetry =
    Boolean(user) &&
    setupIntent &&
    isFoundingAccessCodeRequired() &&
    !hasValidPendingCode;

  const showLoginError = shouldAllowAuthenticatedLoginView(params.error);

  if (user && !needsFoundingCodeRetry && !showLoginError) {
    redirect(await getAuthenticatedAppPath(nextPath, { setupIntent }));
  }

  // New invites use /invite/[token] for password setup. Keep ?invite= for
  // existing-account sign-in / OAuth claim, but send first-time setup there.
  if (params.invite && !user) {
    const preview = await getInvitePreview(params.invite);
    if (preview && !preview.expired) {
      redirect(`/invite/${encodeURIComponent(params.invite)}`);
    }
  }

  const invitePreview = params.invite
    ? await getInvitePreview(params.invite)
    : null;

  return (
    <StudioHomePage
      invitePreview={invitePreview}
      inviteToken={params.invite ?? null}
      authError={params.error ?? null}
      nextPath={nextPath}
      setupIntent={setupIntent}
      userEmail={
        needsFoundingCodeRetry || params.error === "existing_org"
          ? user?.email ?? null
          : null
      }
      foundingCodeRetry={needsFoundingCodeRetry}
    />
  );
}
