import Link from "next/link";
import { InviteAcceptForm } from "@/components/auth/InviteAcceptForm";
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
      <main className="flex min-h-screen items-center justify-center bg-[#ebe4d9] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#ddd4c8] bg-[#f6f2eb] p-8 shadow-sm">
          <p className="font-serif text-2xl text-[#2a2622]">Invite not found</p>
          <p className="mt-3 text-sm leading-relaxed text-[#5c554c]">
            This invite link is invalid or was already used. Ask your admin to
            resend the invitation.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-[#2a2622] underline-offset-2 hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </main>
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
    <main className="flex min-h-screen items-center justify-center bg-[#ebe4d9] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#ddd4c8] bg-[#f6f2eb] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c554c]">
          Hey Ralli · Team invite
        </p>
        <InviteAcceptForm
          inviteToken={token}
          email={preview.email}
          organizationName={preview.organizationName}
          roleLabel={roleLabel}
          expired={preview.expired}
          accountExists={accountExists}
        />
      </div>
    </main>
  );
}
