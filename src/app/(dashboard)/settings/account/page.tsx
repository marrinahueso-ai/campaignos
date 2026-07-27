import { SettingsEaseAccount } from "@/components/settings-v2/SettingsEaseAccount";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSettingsEaseAccountData } from "@/lib/settings-v2/account-queries";
import { UserRound } from "lucide-react";

export const metadata = {
  title: "Account",
};

export default async function AccountSettingsPage() {
  const data = await getSettingsEaseAccountData();

  if (!data) {
    return (
      <EmptyState
        icon={UserRound}
        title="Sign in to manage your account"
        description="Your profile, quiet notifications, and sign-out live here."
        action={{ label: "Sign in", href: "/login" }}
        className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] py-16 shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
      />
    );
  }

  return <SettingsEaseAccount data={data} />;
}
