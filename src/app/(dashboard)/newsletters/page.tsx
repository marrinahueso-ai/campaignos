import { NewsletterLibraryShell } from "@/components/newsletters/NewsletterLibraryShell";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  countNewsletterAudienceMembersByOrg,
  listNewsletterAudiences,
} from "@/lib/newsletter/audiences";
import { parseNewsletterLibraryFilter } from "@/lib/newsletter/library-filters";
import { listNewslettersForOrg } from "@/lib/newsletter/queries";
import { formatRelativeTime } from "@/lib/approvals-scheduling/status";

export const metadata = {
  title: "Newsletters",
};

interface NewslettersPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function NewslettersPage({ searchParams }: NewslettersPageProps) {
  const { filter: filterParam } = await searchParams;
  const filter = parseNewsletterLibraryFilter(filterParam);
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">
          Sign in and set up your organization to view newsletters.
        </p>
      </div>
    );
  }

  const [newsletters, canManageContacts, audiences, members, countByAudience] =
    await Promise.all([
      listNewslettersForOrg(organization.id),
      hasPermission("manage_newsletter_contacts"),
      listNewsletterAudiences(organization.id),
      getOrganizationUsers(organization.id),
      countNewsletterAudienceMembersByOrg(organization.id),
    ]);

  const audienceNameById = new Map(audiences.map((a) => [a.id, a.name]));

  const nameByAuthUserId = new Map<string, string>();
  for (const member of members) {
    if (!member.userId) continue;
    nameByAuthUserId.set(
      member.userId,
      member.displayName?.trim() || member.email?.trim() || "Teammate",
    );
  }

  const cards = newsletters.map((newsletter) => {
    const audienceId =
      newsletter.approvedAudienceId ?? newsletter.proposedAudienceId ?? null;
    return {
      newsletter,
      audienceName: audienceId ? audienceNameById.get(audienceId) ?? null : null,
      audienceCount: audienceId ? countByAudience.get(audienceId) ?? null : null,
    };
  });

  const newest = newsletters[0];
  const recentActivityLabel = newest
    ? `${newest.title || "Newsletter"} updated ${formatRelativeTime(newest.updatedAt)}${
        newest.updatedBy
          ? ` by ${nameByAuthUserId.get(newest.updatedBy) ?? "a teammate"}`
          : ""
      }`
    : null;

  return (
    <NewsletterLibraryShell
      cards={cards}
      filter={filter}
      canManageContacts={canManageContacts}
      recentActivityLabel={recentActivityLabel}
    />
  );
}
