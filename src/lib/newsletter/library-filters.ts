import type { NewsletterStatus } from "@/lib/newsletter/types";

export type NewsletterLibraryFilter =
  | "all"
  | "in_progress"
  | "waiting"
  | "changes_requested"
  | "scheduled"
  | "sent"
  | "templates";

export const NEWSLETTER_LIBRARY_FILTERS: {
  id: NewsletterLibraryFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In Progress" },
  { id: "waiting", label: "Waiting for Approval" },
  { id: "changes_requested", label: "Changes Requested" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
  { id: "templates", label: "Templates" },
];

export function parseNewsletterLibraryFilter(
  value: string | null | undefined,
): NewsletterLibraryFilter {
  switch (value) {
    case "in_progress":
    case "waiting":
    case "changes_requested":
    case "scheduled":
    case "sent":
    case "templates":
      return value;
    default:
      return "all";
  }
}

export function newsletterMatchesLibraryFilter(
  status: NewsletterStatus,
  filter: NewsletterLibraryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "in_progress":
      return status === "draft" || status === "failed";
    case "waiting":
      return status === "needs_approval";
    case "changes_requested":
      return status === "changes_requested";
    case "scheduled":
      return status === "scheduled" || status === "approved" || status === "sending";
    case "sent":
      return status === "sent";
    case "templates":
      return false;
    default:
      return true;
  }
}

/** Where the library card should open for a given status. */
export function newsletterLibraryHref(newsletter: {
  id: string;
  status: NewsletterStatus;
}): string {
  switch (newsletter.status) {
    case "draft":
    case "failed":
      return `/newsletter-composer?newsletterId=${encodeURIComponent(newsletter.id)}`;
    case "changes_requested":
      return `/newsletters/${newsletter.id}?view=changes`;
    case "needs_approval":
    case "approved":
    case "scheduled":
    case "sending":
    case "sent":
      return `/newsletters/${newsletter.id}`;
    default:
      return `/newsletters/${newsletter.id}`;
  }
}
