import { getAuthUser } from "@/lib/auth/queries";
import { getInvitePreview } from "@/lib/auth/invite-preview";
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
  const user = await getAuthUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const invitePreview = params.invite
    ? await getInvitePreview(params.invite)
    : null;

  return (
    <StudioHomePage
      invitePreview={invitePreview}
      inviteToken={params.invite ?? null}
      authError={params.error ?? null}
    />
  );
}
