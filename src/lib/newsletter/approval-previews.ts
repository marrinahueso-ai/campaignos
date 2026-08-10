import "server-only";

import {
  isNewsletterMilestoneId,
  parseNewsletterIdFromMilestoneId,
} from "@/lib/newsletter/approval";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
import { createClient } from "@/lib/supabase/server";

export type NewsletterApprovalPreviewPayload = {
  newsletterId: string;
  subject: string | null;
  html: string | null;
  snapshot: NewsletterComposerState | null;
  audienceName: string | null;
  audienceId: string | null;
};

/**
 * Batch-load rendered HTML + composer snapshots for newsletter approval rows
 * so the Approvals hub / review drawer can show the real email, not a blank tile.
 */
export async function loadNewsletterApprovalPreviews(
  items: UnifiedApprovalItem[],
): Promise<Map<string, NewsletterApprovalPreviewPayload>> {
  const newsletterIds = Array.from(
    new Set(
      items
        .map((item) => parseNewsletterIdFromMilestoneId(item.campaignMilestoneId))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const byNewsletterId = new Map<string, NewsletterApprovalPreviewPayload>();
  if (newsletterIds.length === 0) return byNewsletterId;

  const supabase = await createClient();
  const { data: newsletters, error } = await supabase
    .from("newsletters")
    .select(
      "id, subject, current_version_id, composer_state, proposed_audience_id, approved_audience_id",
    )
    .in("id", newsletterIds);

  if (error) {
    console.error("Failed to load newsletter approval previews:", error.message);
    return byNewsletterId;
  }

  const versionIds = (newsletters ?? [])
    .map((row) => row.current_version_id as string | null)
    .filter((id): id is string => Boolean(id));

  const audienceIds = Array.from(
    new Set(
      (newsletters ?? [])
        .flatMap((row) => [
          row.proposed_audience_id as string | null,
          row.approved_audience_id as string | null,
        ])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const versionById = new Map<
    string,
    { rendered_html: string | null; snapshot: unknown; subject: string | null }
  >();
  const audienceNameById = new Map<string, string>();

  if (versionIds.length > 0) {
    const { data: versions, error: versionError } = await supabase
      .from("newsletter_versions")
      .select("id, rendered_html, snapshot, subject")
      .in("id", versionIds);

    if (versionError) {
      console.error(
        "Failed to load newsletter version previews:",
        versionError.message,
      );
    } else {
      for (const version of versions ?? []) {
        versionById.set(version.id as string, {
          rendered_html: (version.rendered_html as string | null) ?? null,
          snapshot: version.snapshot,
          subject: (version.subject as string | null) ?? null,
        });
      }
    }
  }

  if (audienceIds.length > 0) {
    const { data: audiences, error: audienceError } = await supabase
      .from("newsletter_audiences")
      .select("id, name")
      .in("id", audienceIds);

    if (audienceError) {
      console.error(
        "Failed to load newsletter audience names for approvals:",
        audienceError.message,
      );
    } else {
      for (const audience of audiences ?? []) {
        audienceNameById.set(
          audience.id as string,
          (audience.name as string | null)?.trim() || "Audience",
        );
      }
    }
  }

  for (const row of newsletters ?? []) {
    const newsletterId = row.id as string;
    const version = row.current_version_id
      ? versionById.get(row.current_version_id as string)
      : null;
    const snapshot =
      (version?.snapshot as NewsletterComposerState | null) ??
      (row.composer_state as NewsletterComposerState | null) ??
      null;
    const audienceId =
      (row.proposed_audience_id as string | null) ??
      (row.approved_audience_id as string | null) ??
      null;
    byNewsletterId.set(newsletterId, {
      newsletterId,
      subject: version?.subject ?? (row.subject as string | null) ?? null,
      html: version?.rendered_html ?? null,
      snapshot,
      audienceId,
      audienceName: audienceId ? (audienceNameById.get(audienceId) ?? null) : null,
    });
  }

  return byNewsletterId;
}

export function attachNewsletterPreviewsToItems(
  items: UnifiedApprovalItem[],
  previews: Map<string, NewsletterApprovalPreviewPayload>,
): UnifiedApprovalItem[] {
  return items.map((item) => {
    if (!isNewsletterMilestoneId(item.campaignMilestoneId)) return item;
    const newsletterId = parseNewsletterIdFromMilestoneId(item.campaignMilestoneId);
    if (!newsletterId) return item;
    const preview = previews.get(newsletterId);
    if (!preview) return item;
    return {
      ...item,
      preview: {
        ...item.preview,
        captionText: preview.subject ?? item.preview.captionText,
        newsletterHtml: preview.html,
        newsletterSnapshot: preview.snapshot,
        newsletterAudienceId: preview.audienceId,
        newsletterAudienceName: preview.audienceName,
      },
    };
  });
}
