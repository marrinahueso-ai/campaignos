import { redirect } from "next/navigation";

interface EventPlaybookRedirectProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventPlaybookHubRedirectPage({
  params,
}: EventPlaybookRedirectProps) {
  const { eventId } = await params;
  redirect(`/events/${eventId}`);
}
