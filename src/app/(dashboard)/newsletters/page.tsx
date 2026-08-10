import Link from "next/link";
import { ArrowRight, Mail, Users } from "lucide-react";

import { NewsletterStatusBadge } from "@/components/newsletters/NewsletterStatusBadge";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { listNewslettersForOrg } from "@/lib/newsletter/queries";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata = {
  title: "Newsletters",
};

export default async function NewslettersPage() {
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

  const [newsletters, canManageContacts] = await Promise.all([
    listNewslettersForOrg(organization.id),
    hasPermission("manage_newsletter_contacts"),
  ]);

  return (
    <div className="studio-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <p className="studio-eyebrow">Hey Ralli</p>
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] text-cos-text">
            Newsletters
          </h1>
          <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-cos-muted">
            Draft, submit for approval, and send your organization&apos;s newsletters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageContacts ? (
            <Link
              href="/newsletter-contacts"
              className="inline-flex items-center gap-1.5 rounded-full border border-cos-border bg-cos-card px-4 py-2.5 text-sm font-semibold text-cos-text transition hover:border-cos-brand-sage hover:bg-cos-bg"
            >
              <Users className="h-4 w-4" strokeWidth={1.75} />
              Newsletter Contacts
            </Link>
          ) : null}
          <Link
            href="/newsletter-composer"
            className="inline-flex items-center gap-1.5 rounded-full bg-cos-primary px-4 py-2.5 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover"
          >
            <Mail className="h-4 w-4" strokeWidth={1.75} />
            New newsletter
          </Link>
        </div>
      </header>

      {newsletters.length === 0 ? (
        <div className="rounded-[22px] border border-cos-border bg-cos-card px-6 py-10 text-center text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          No newsletters yet.{" "}
          <Link href="/newsletter-composer" className="font-semibold text-cos-text underline-offset-2 hover:underline">
            Start your first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          <div className="divide-y divide-cos-border">
            {newsletters.map((newsletter) => (
              <Link
                key={newsletter.id}
                href={`/newsletters/${newsletter.id}`}
                className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-cos-bg/40 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-cos-text">
                      {newsletter.title || "Untitled newsletter"}
                    </span>
                    <NewsletterStatusBadge status={newsletter.status} />
                  </div>
                  {newsletter.subject ? (
                    <p className="line-clamp-1 text-sm text-cos-muted">
                      {newsletter.subject}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm text-cos-muted sm:self-center">
                  <span>Updated {formatDateTime(newsletter.updatedAt)}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
