import { Lock } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function AgreementThemeShell({
  eyebrow,
  children,
  footer,
}: {
  eyebrow: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#fffcf7_0%,#f6f2eb_45%,#ebe4d9_100%)] text-cos-text">
      <header className="border-b border-cos-border/80 bg-cos-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLogo href="/" variant="full" size="sidebar" />
          <p className="flex items-center gap-2 text-sm text-cos-muted">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
            {eyebrow}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
      {footer}
    </div>
  );
}

export function formatAgreementDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
