import { getAuthUser } from "@/lib/auth/queries";
import { getInvitePreview } from "@/lib/auth/invite-preview";
import {
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getPendingFoundingAccessCode } from "@/lib/auth/founding-access-server";
import {
  getAuthenticatedAppPath,
  shouldAllowAuthenticatedLoginView,
} from "@/lib/auth/post-auth-path";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { redirect } from "next/navigation";
import { MarketingWowAuthShell } from "@/components/marketing-wow/MarketingWowAuthShell";
import { MarketingWowLoginForm } from "@/components/marketing-wow/MarketingWowLoginForm";
import { marketingAuthErrorMessage } from "@/components/marketing-wow/auth-messages";

export const metadata = {
  title: "Log in",
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

  if (params.intent === "setup") {
    const qs = new URLSearchParams();
    if (params.error) qs.set("error", params.error);
    if (params.next) qs.set("next", params.next);
    redirect(`/signup${qs.toString() ? `?${qs}` : ""}`);
  }

  const nextPath =
    safeNextPath(params.next) ?? null;

  const user = await getAuthUser();
  const pendingCode = user ? await getPendingFoundingAccessCode() : null;
  const hasValidPendingCode =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);
  const needsFoundingCodeRetry =
    Boolean(user) &&
    isFoundingAccessCodeRequired() &&
    !hasValidPendingCode &&
    params.error === "code_required";

  if (needsFoundingCodeRetry) {
    redirect("/signup?error=code_required");
  }

  const showLoginError = shouldAllowAuthenticatedLoginView(params.error);

  if (user && !showLoginError) {
    redirect(await getAuthenticatedAppPath(nextPath));
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

  const authErrorMessage = marketingAuthErrorMessage(params.error, {
    inviteEmail: invitePreview?.email ?? null,
  });

  return (
    <MarketingWowAuthShell
      imageSrc="/images/spring-carnival-campaign.png"
      visualTitle="Welcome back to calm."
      visualSupport="Pick up the year where your team left off — approvals, calendar, and Create with AI waiting."
    >
      <MarketingWowLoginForm
        inviteToken={params.invite ?? null}
        defaultEmail={
          invitePreview?.email ??
          (params.error === "existing_org" ||
          params.error === "account_deactivated"
            ? user?.email ?? ""
            : "")
        }
        nextPath={nextPath}
        authErrorMessage={authErrorMessage}
      />
    </MarketingWowAuthShell>
  );
}
