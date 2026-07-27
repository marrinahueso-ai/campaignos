import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { MarketingWowHome } from "@/components/marketing-wow/MarketingWowHome";

export const metadata = {
  title: "Hey Ralli",
  description:
    "School communications, finally calm. Plan the year, create with AI, approve & schedule social, rally volunteers — one workspace for PTA teams.",
};

interface HomePageProps {
  searchParams: Promise<{
    invite?: string;
    error?: string;
    intent?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [user, params] = await Promise.all([getAuthUser(), searchParams]);

  // Invites use the dedicated accept flow, not the marketing homepage.
  if (params.invite) {
    redirect(`/invite/${encodeURIComponent(params.invite)}`);
  }

  // Founding signup lives on /signup (keep old deep links working).
  if (params.intent === "setup") {
    const qs = new URLSearchParams();
    if (params.error) qs.set("error", params.error);
    redirect(`/signup${qs.toString() ? `?${qs}` : ""}`);
  }

  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <MarketingWowHome
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
