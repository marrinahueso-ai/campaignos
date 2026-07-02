import { getAuthUser } from "@/lib/auth/queries";
import { getInvitePreview } from "@/lib/auth/invite-preview";
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
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  const user = await getAuthUser();
  if (user) {
    redirect(safeNextPath(params.next) ?? "/dashboard");
  }

  const invitePreview = params.invite
    ? await getInvitePreview(params.invite)
    : null;

  return (
    <StudioHomePage
      invitePreview={invitePreview}
      inviteToken={params.invite ?? null}
      authError={params.error ?? null}
      nextPath={params.next ?? null}
    />
  );
}
