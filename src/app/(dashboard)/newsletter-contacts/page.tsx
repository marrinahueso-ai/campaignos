import Link from "next/link";

import { NewsletterContactsShell } from "@/components/newsletters/NewsletterContactsShell";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { listNewsletterAudiences, listNewsletterAudienceMemberIds } from "@/lib/newsletter/audiences";
import { listNewsletterContacts } from "@/lib/newsletter/contacts";

export const metadata = {
  title: "Newsletter Contacts",
};

const CONTACTS_LIMIT = 1000;

interface NewsletterContactsPageProps {
  searchParams: Promise<{
    tab?: string;
    audienceId?: string;
    returnTo?: string;
  }>;
}

export default async function NewsletterContactsPage({
  searchParams,
}: NewsletterContactsPageProps) {
  const { tab, audienceId, returnTo } = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">
          Sign in and set up your organization to manage newsletter contacts.
        </p>
      </div>
    );
  }

  const canManage = await hasPermission("manage_newsletter_contacts");
  if (!canManage) {
    return (
      <div className="studio-page space-y-4">
        <Link
          href="/newsletters"
          className="text-sm font-semibold text-cos-muted transition hover:text-cos-text"
        >
          ← Newsletters
        </Link>
        <div className="rounded-2xl border border-cos-border bg-cos-card px-4 py-3.5 text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          You don&apos;t have permission to manage newsletter contacts. Ask an admin for access.
        </div>
      </div>
    );
  }

  const [contacts, audiences] = await Promise.all([
    listNewsletterContacts(organization.id, { limit: CONTACTS_LIMIT }),
    listNewsletterAudiences(organization.id),
  ]);

  const memberIdsByAudience: Record<string, string[]> = {};
  await Promise.all(
    audiences.map(async (audience) => {
      memberIdsByAudience[audience.id] = await listNewsletterAudienceMemberIds(
        organization.id,
        audience.id,
      );
    }),
  );

  const initialTab = tab === "audiences" ? "audiences" : "contacts";

  return (
    <NewsletterContactsShell
      contacts={contacts}
      audiences={audiences}
      memberIdsByAudience={memberIdsByAudience}
      initialTab={initialTab}
      initialAudienceId={audienceId?.trim() || null}
      returnTo={returnTo?.trim() || null}
    />
  );
}
