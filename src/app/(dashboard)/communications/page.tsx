import { CommunicationsHub } from "@/components/communications-hub/CommunicationsHub";
import { getInboxPageData } from "@/lib/inbox/queries";

export const metadata = {
  title: "Communications Hub",
  description: "AI-Powered Inbox for Social Media",
  alternates: {
    canonical: "/communications",
  },
};

export default async function CommunicationsPage() {
  const data = await getInboxPageData();

  return <CommunicationsHub data={data} />;
}
