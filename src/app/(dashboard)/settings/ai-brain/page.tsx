import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings",
};

/** Customer AI Brain is unshipped for launch — keep the URL, send people to Branding. */
export default function AiBrainSettingsPage() {
  redirect("/settings/branding");
}
