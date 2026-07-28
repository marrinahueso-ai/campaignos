import { CommunicationsHub } from "@/components/communications-hub/CommunicationsHub";
import { getInboxPageData } from "@/lib/inbox/queries";

export const metadata = {
  title: "Communications Hub",
  description: "Reply to Facebook Page and Instagram messages in one place",
  alternates: {
    canonical: "/communications",
  },
};

export default async function CommunicationsPage() {
  const data = await getInboxPageData();

  return <CommunicationsHub data={data} />;
}
