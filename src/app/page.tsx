import { getAuthUser } from "@/lib/auth/queries";
import { getInvitePreview } from "@/lib/auth/invite-preview";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioHomePage } from "@/components/marketing/StudioHomePage";

export const metadata = {
  title: "Hey Ralli",
  description:
    "Plan PTO campaigns, create artwork, draft captions, and publish to Facebook and Instagram — one calm workspace for busy school teams.",
};

interface HomePageProps {
  searchParams: Promise<{
    invite?: string;
    error?: string;
    intent?: string;
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

  const setupIntent = params.intent === "setup";
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <StudioHomePage
      invitePreview={invitePreview}
      inviteToken={params.invite ?? null}
      authError={params.error ?? null}
      userEmail={user?.email ?? null}
      setupIntent={setupIntent}
      workspaceHref={workspaceHref}
    />
  );
}
