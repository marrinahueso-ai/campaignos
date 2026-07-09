import { SettingsV2Nav } from "@/components/settings-v2/SettingsV2Nav";

interface SettingsV2ShellProps {
  children: React.ReactNode;
}

export function SettingsV2Shell({ children }: SettingsV2ShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl pb-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SettingsV2Nav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
