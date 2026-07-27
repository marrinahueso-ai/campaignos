import { SettingsEaseShell } from "@/components/settings-v2/SettingsEaseShell";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsEaseShell>{children}</SettingsEaseShell>;
}
