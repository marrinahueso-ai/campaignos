import { InboxHub } from "@/components/inbox/InboxHub";
import { getInboxPageData } from "@/lib/inbox/queries";

export const metadata = {
  title: "Inbox",
};

interface InboxPageProps {
  searchParams: Promise<{
    connected?: string;
    error?: string;
  }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const params = await searchParams;
  const data = await getInboxPageData({
    oauthErrorCode: params.error ?? null,
    connectedJustNow: params.connected === "1",
  });

  return <InboxHub data={data} />;
}
