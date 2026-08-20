import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings",
};

/** Customer Canva connect UI is unshipped for launch — keep the URL, send people to Integrations. */
export default function CanvaSettingsPage() {
  redirect("/settings/integrations");
}
