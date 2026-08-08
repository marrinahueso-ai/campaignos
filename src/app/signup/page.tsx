import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/queries";
import {
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getPendingFoundingAccessCode } from "@/lib/auth/founding-access-server";
import {
  getAuthenticatedAppPath,
  ONBOARDING_PATH,
  shouldAllowAuthenticatedLoginView,
} from "@/lib/auth/post-auth-path";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { MarketingAuthCardShell } from "@/components/marketing-wow/MarketingAuthCardShell";
import { MarketingWowSignupForm } from "@/components/marketing-wow/MarketingWowSignupForm";
import { marketingAuthErrorMessage } from "@/components/marketing-wow/auth-messages";
import { isPaidPlanId } from "@/lib/billing/plan-catalog";

export const metadata = {
  title: "Sign up",
};

interface SignupPageProps {
  searchParams: Promise<{
    error?: string;
    next?: string;
    plan?: string;
    founding?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next) ?? ONBOARDING_PATH;
  const selectedPlanId = isPaidPlanId(params.plan) ? params.plan : null;
  const foundingFocused = params.founding === "1";

  const user = await getAuthUser();
  const pendingCode = user ? await getPendingFoundingAccessCode() : null;
  const hasValidPendingCode =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);
  const needsFoundingCodeRetry =
    Boolean(user) &&
    isFoundingAccessCodeRequired() &&
    !hasValidPendingCode &&
    (params.error === "code_required" || params.error === "org_required");

  const showLoginError = shouldAllowAuthenticatedLoginView(params.error);

  if (user && !needsFoundingCodeRetry && !showLoginError) {
    redirect(await getAuthenticatedAppPath(nextPath, { setupIntent: true }));
  }

  const authErrorMessage = marketingAuthErrorMessage(params.error, {
    setupIntent: true,
  });

  const showCheckout = needsFoundingCodeRetry || Boolean(selectedPlanId);

  return (
    <MarketingAuthCardShell
      maxWidthClassName={showCheckout ? "max-w-[440px]" : "max-w-[480px]"}
    >
      <MarketingWowSignupForm
        defaultEmail={needsFoundingCodeRetry ? user?.email ?? "" : ""}
        nextPath={nextPath}
        selectedPlanId={selectedPlanId}
        foundingCodeRetry={needsFoundingCodeRetry}
        foundingFocused={foundingFocused}
        authErrorMessage={authErrorMessage}
      />
    </MarketingAuthCardShell>
  );
}
