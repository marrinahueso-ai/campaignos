"use client";

interface SettingsV2ShellProps {
  children: React.ReactNode;
}

export function SettingsV2Shell({ children }: SettingsV2ShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl pb-12">
      <main className="min-w-0">{children}</main>
    </div>
  );
}
