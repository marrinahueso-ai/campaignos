import { getAuthUser } from "@/lib/auth/queries";
import { getInvitePreview } from "@/lib/auth/invite-preview";
import {
  getAuthenticatedAppPath,
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
  if (user) {
    redirect(await getAuthenticatedAppPath(nextPath));
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
    />
  );
}
