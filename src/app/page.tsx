import { getAuthUser } from "@/lib/auth/queries";
import { getInvitePreview } from "@/lib/auth/invite-preview";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioHomePage } from "@/components/marketing/StudioHomePage";

interface HomePageProps {
  searchParams: Promise<{
    invite?: string;
    error?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [user, params] = await Promise.all([
    getAuthUser(),
    searchParams,
  ]);

  const invitePreview = params.invite
    ? await getInvitePreview(params.invite)
    : null;

  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <StudioHomePage
      invitePreview={invitePreview}
      inviteToken={params.invite ?? null}
      authError={params.error ?? null}
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
