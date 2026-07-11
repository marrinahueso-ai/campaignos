import { redirect } from "next/navigation";

export const metadata = {
  title: "Communications Hub",
};

export default function InboxRedirectPage() {
  redirect("/communications");
}
