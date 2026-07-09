import { SettingsV2Shell } from "@/components/settings-v2/SettingsV2Shell";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsV2Shell>{children}</SettingsV2Shell>;
}
