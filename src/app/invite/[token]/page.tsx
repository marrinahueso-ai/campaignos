import Link from "next/link";
import { MarketingWowAuthShell } from "@/components/marketing-wow/MarketingWowAuthShell";
import { MarketingWowInviteForm } from "@/components/marketing-wow/MarketingWowInviteForm";
import { MarketingWowLegalLinks } from "@/components/marketing-wow/MarketingWowAuthShell";
import { campaignRoleLabel, isCampaignRole } from "@/lib/auth/campaign-roles";
import { authUserExistsForEmail } from "@/lib/auth/invite-credentials";
import { getInvitePreview } from "@/lib/auth/invite-preview";
import { getAuthUser } from "@/lib/auth/queries";
import { acceptPendingInvitesForUser } from "@/lib/auth/membership-queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Accept invite",
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: InvitePageProps) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const preview = await getInvitePreview(token);

  if (!preview) {
    return (
      <MarketingWowAuthShell
        imageSrc="/images/fall-festival-campaign.png"
        visualTitle="You’re invited."
        visualSupport="Join this organization on Hey Ralli with the role your admin chose."
      >
        <h1>Invite not found</h1>
        <p className="sub">
          This invite link is invalid or was already used. Ask your admin to
          resend the invitation.
        </p>
        <p className="auth-alt">
          <Link href="/login" className="btn-text">
            Go to sign in
          </Link>
        </p>
        <MarketingWowLegalLinks />
      </MarketingWowAuthShell>
    );
  }

  const user = await getAuthUser();
  if (user?.email && !preview.expired) {
    await acceptPendingInvitesForUser(user.id, user.email, {
      inviteToken: token,
    });
    redirect(await getAuthenticatedAppPath());
  }

  const accountExists = preview.expired
    ? false
    : await authUserExistsForEmail(preview.email);

  const roleLabel = isCampaignRole(preview.campaignRole)
    ? campaignRoleLabel(preview.campaignRole)
    : preview.roleName ?? "team member";

  return (
    <MarketingWowAuthShell
      imageSrc="/images/fall-festival-campaign.png"
      visualTitle="You’re invited."
      visualSupport="Join this organization on Hey Ralli with the role your admin chose."
    >
      <MarketingWowInviteForm
        inviteToken={token}
        email={preview.email}
        organizationName={preview.organizationName}
        roleLabel={roleLabel}
        expired={preview.expired}
        accountExists={accountExists}
      />
    </MarketingWowAuthShell>
  );
}
