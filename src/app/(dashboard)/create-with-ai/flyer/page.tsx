import { notFound, redirect } from "next/navigation";

import { FlyerBuilderShell } from "@/components/flyers/FlyerBuilderShell";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getCampaignSocialFeedUrlMap } from "@/lib/campaign-builder-v2/social-feed-artwork";
import { getEventArtworkMap } from "@/lib/event-workspace/get-event-artwork";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { getFlyerComposerBrandKit } from "@/lib/flyer-composer/brand-kit";
import { createFlyer, updateFlyerDraft } from "@/lib/flyers/actions";
import { resolveFlyerEventInspirationUrl } from "@/lib/flyers/event-inspiration";
import { getFlyerById } from "@/lib/flyers/queries";
import { getEventVolunteerSignupUrls } from "@/lib/homepage-composer/volunteer-links";
import type { NewsletterComposerEvent } from "@/lib/newsletter-composer/types";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";

export const metadata = {
  title: "Flyer · Create with AI",
  robots: {
    index: false,
    follow: false,
  },
};

type FlyerComposerPageProps = {
  searchParams: Promise<{
    flyerId?: string;
    eventId?: string;
    event?: string;
    fresh?: string;
    view?: string;
  }>;
};

export default async function FlyerComposerPage({
  searchParams,
}: FlyerComposerPageProps) {
  const params = await searchParams;
  const eventId = (params.eventId || params.event || "").trim() || null;
  const flyerId = params.flyerId?.trim() || null;
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">
          Sign in and set up your organization to create flyers.
        </p>
      </div>
    );
  }

  if (!flyerId) {
    const canEdit = await hasPermission("upload_artwork");
    if (!canEdit) {
      return (
        <div className="studio-page space-y-4">
          <p className="text-sm text-cos-muted">
            You don’t have permission to create flyers.
          </p>
        </div>
      );
    }
    const created = await createFlyer({ eventId });
    if (!created.ok) {
      return (
        <div className="studio-page space-y-4">
          <p className="text-sm text-[#a65a3a]">{created.error}</p>
        </div>
      );
    }
    const qs = new URLSearchParams({ flyerId: created.flyerId });
    if (eventId) qs.set("eventId", eventId);
    redirect(`/create-with-ai/flyer?${qs.toString()}`);
  }

  const [flyer, campaignEvents, brandKit, canEdit, assignee] = await Promise.all([
    getFlyerById(organization.id, flyerId),
    getCampaignPageEvents(organization.id),
    getFlyerComposerBrandKit(),
    hasPermission("upload_artwork"),
    resolveApprovalAssignee(organization.id, null),
  ]);

  if (!flyer) notFound();

  const [volunteerUrls, artworkByEvent, socialFeedByEvent] = await Promise.all([
    getEventVolunteerSignupUrls(campaignEvents.map((event) => event.id)),
    getEventArtworkMap(campaignEvents.map((event) => event.id)),
    getCampaignSocialFeedUrlMap(campaignEvents.map((event) => event.id)),
  ]);

  const events: NewsletterComposerEvent[] = campaignEvents.map((event) => {
    const artworkUrl = artworkByEvent.get(event.id)?.imageUrl?.trim() || null;
    return {
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      date: event.date,
      time: event.time,
      location: event.location ?? null,
      imageUrl: resolveFlyerEventInspirationUrl({
        socialFeedUrl: socialFeedByEvent.get(event.id) ?? null,
        heroArtworkUrl: artworkUrl,
        approvedSquareUrl: event.approvedSquareImageUrl,
      }),
      volunteerSignupUrl: volunteerUrls.get(event.id) ?? "",
    };
  });

  let flyerForShell = flyer;
  if (eventId && !flyer.eventId) {
    await updateFlyerDraft({ flyerId: flyer.id, eventId });
    flyerForShell = { ...flyer, eventId };
  }

  return (
    <FlyerBuilderShell
      flyer={flyerForShell}
      events={events}
      brandKit={
        brandKit
          ? {
              organizationShortName: brandKit.organizationShortName,
              primaryColor: brandKit.primaryColor,
              accentColor: brandKit.accentColor,
              fontStyle: brandKit.fontStyle,
              mascotLabel: brandKit.mascotLabel,
              ptoLogoUploaded: brandKit.ptoLogoUploaded,
              schoolLogoUploaded: brandKit.schoolLogoUploaded,
              logos: brandKit.logos,
            }
          : null
      }
      canEdit={canEdit}
      approverDisplayName={
        assignee.hasAssignedPerson ? assignee.assigneeDisplayName : null
      }
    />
  );
}
