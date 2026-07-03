import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  Home,
  LayoutDashboard,
  Megaphone,
  Palette,
  Send,
} from "lucide-react";
import { PREVIEW_SCHOOL_NAME } from "@/lib/marketing/feature-preview-fixtures";
import { cn } from "@/lib/utils/cn";
import type { FeaturePreviewSlug } from "@/lib/marketing/feature-preview-fixtures";

const NAV_ITEMS = [
  { slug: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, href: "dashboard" },
  { slug: "calendar" as const, label: "Calendar", icon: CalendarRange, href: "calendar" },
  { slug: "workflow" as const, label: "Campaigns", icon: Megaphone, href: "workflow" },
  { slug: "publish" as const, label: "Publishing", icon: Send, href: "publish" },
  { slug: "approvals" as const, label: "Approvals", icon: CheckCircle2, href: "approvals" },
  { slug: "artwork" as const, label: "Artwork", icon: Palette, href: "artwork" },
  { slug: null, label: "Insights", icon: BarChart3, href: null },
  { slug: null, label: "School Setup", icon: GraduationCap, href: null },
];

interface FeaturePreviewChromeProps {
  active: FeaturePreviewSlug;
  children: React.ReactNode;
  compact?: boolean;
}

export function FeaturePreviewChrome({
  active,
  children,
  compact = false,
}: FeaturePreviewChromeProps) {
  return (
    <div className="flex min-h-[520px] overflow-hidden border border-cos-border bg-cos-bg shadow-sm">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-cos-border bg-cos-card sm:flex">
        <div className="border-b border-cos-border px-4 py-4">
          <p className="font-display text-lg text-cos-text">CampaignOS</p>
          <p className="text-[10px] tracking-[0.18em] text-cos-muted uppercase">Studio</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          <PreviewNavItem label="Home" icon={Home} active={false} />
          {NAV_ITEMS.map((item) => (
            <PreviewNavItem
              key={item.label}
              label={item.label}
              icon={item.icon}
              active={
                item.href === active ||
                (active === "heatmap" && item.href === "calendar")
              }
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-cos-border/80 bg-cos-card/90 px-4 py-3 sm:px-6">
          <p className="studio-eyebrow">{PREVIEW_SCHOOL_NAME}</p>
          <p className="font-display text-xl text-cos-text sm:text-2xl">PTO Campaign Studio</p>
        </header>
        <div className={cn("flex-1 overflow-hidden", compact ? "p-4" : "p-5 sm:p-6")}>
          {children}
        </div>
      </div>
    </div>
  );
}

function PreviewNavItem({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
        active
          ? "bg-cos-dark text-[#f6f2eb]"
          : "text-cos-muted",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      <span>{label}</span>
    </div>
  );
}
