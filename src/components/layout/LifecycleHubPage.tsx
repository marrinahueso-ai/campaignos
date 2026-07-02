import { EmptyState } from "@/components/ui/EmptyState";
import { LifecycleSectionCard } from "@/components/layout/LifecycleSectionCard";
import { Sparkles, type LucideIcon } from "lucide-react";

export interface LifecycleHubSection {
  id: string;
  title: string;
  description: string;
  content?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  count?: number;
  collapsedSummary?: string | null;
}

interface LifecycleHubPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  sections: LifecycleHubSection[];
}

export function LifecycleHubPage({
  title,
  description,
  icon: Icon,
  sections,
}: LifecycleHubPageProps) {
  return (
    <div className="studio-page space-y-10">
      <header className="border-b border-cos-border pb-8">
        <div className="flex items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-cos-border bg-cos-card">
            <Icon className="h-5 w-5 text-cos-accent" strokeWidth={1.5} />
          </div>
          <div>
            <p className="studio-eyebrow">Workspace</p>
            <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
              {description}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {sections.map((section) => (
          <LifecycleSectionCard
            key={section.id}
            id={section.id}
            title={section.title}
            description={section.description}
            collapsible={section.collapsible}
            defaultOpen={section.defaultOpen}
            count={section.count}
            collapsedSummary={section.collapsedSummary}
          >
            {section.content ?? (
              <EmptyState
                icon={Sparkles}
                title="Coming soon"
                description="This section will connect to your campaign workflow in a future release."
                className="border-0 bg-transparent py-6 shadow-none"
              />
            )}
          </LifecycleSectionCard>
        ))}
      </div>
    </div>
  );
}
