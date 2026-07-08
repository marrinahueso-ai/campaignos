import { redirect } from "next/navigation";

export const metadata = {
  title: "Approvals & Scheduling",
};

export default function PublishingPage() {
  redirect("/approvals");
}
