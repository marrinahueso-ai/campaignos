import { InboxHub } from "@/components/inbox/InboxHub";
import { getInboxPageData } from "@/lib/inbox/queries";

export const metadata = {
  title: "Inbox",
};

export default async function InboxPage() {
  const data = await getInboxPageData();

  return <InboxHub data={data} />;
}
